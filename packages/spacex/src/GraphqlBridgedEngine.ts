import { GraphqlError } from './GraphqlError';
import { Queue } from './utils/Queue';
import { Watcher } from './utils/Watcher';
import { randomKey } from './utils/randomKey';
import {
    GraphqlEngine,
    GraphqlEngineStatus,
    OperationParameters,
    GraphqlQueryWatch,
    GraphqlActiveSubscription,
    GraphqlSubscriptionHandler
} from './GraphqlEngine';
import { delay } from './utils/delay';

class BridgedQueryWatch {
    hasValue: boolean = false;
    hasError: boolean = false;
    value?: any;
    error?: Error;
}

export abstract class GraphqlBridgedEngine implements GraphqlEngine {

    private handlersMap = new Map<string, string>();
    private handlers = new Map<string, (data?: any, error?: Error) => void>();
    private queryWatches = new Map<string, BridgedQueryWatch>();
    private getApplicationError: (src: Error) => Error | null;

    // Status
    protected readonly statusWatcher: Watcher<GraphqlEngineStatus> = new Watcher();
    get status(): GraphqlEngineStatus {
        return this.statusWatcher.getState()!!;
    }
    watchStatus(handler: (status: GraphqlEngineStatus) => void) {
        return this.statusWatcher.watch(handler);
    }

    constructor(opts?: { getApplicationError?: (src: Error) => Error | null }) {
        this.statusWatcher.setState({ status: 'connecting' });
        if (opts && opts.getApplicationError) {
            this.getApplicationError = opts.getApplicationError;
        } else {
            this.getApplicationError = (src) => src instanceof GraphqlError ? src : null;
        }
    }

    abstract close(): void;

    //
    // Query
    //

    async query<TQuery, TVars>(query: string, vars?: TVars, params?: OperationParameters): Promise<TQuery> {

        // Retry logic
        while (true) {
            try {
                let id = this.nextKey();
                let res = this.registerPromiseHandler<TQuery>(id);
                this.postQuery(id, query, vars, params);
                return await res;
            } catch (e) {
                let appError = this.getApplicationError(e);
                if (appError) {
                    throw appError;
                } else {
                    console.warn('Unknown error during query');
                    console.warn(e);
                }
                await delay(1000);
            }
        }
    }

    queryWatch<TQuery, TVars>(query: string, vars?: TVars, params?: OperationParameters): GraphqlQueryWatch<TQuery> {
        let id = this.nextKey();
        let currentId = id;
        let watch = new BridgedQueryWatch();
        let callbacks = new Map<string, (args: { data?: TQuery, error?: Error }) => void>();
        let resolved = false;
        let resolve!: () => void;
        let reject!: () => void;
        let promise = new Promise<void>((rl, rj) => {
            resolve = rl;
            reject = rj;
        });
        let completed = false;
        this.queryWatches.set(id, watch);
        this.handlersMap.set(currentId, id);
        this.handlers.set(id, (data, error) => {

            // Special retry action
            if (error) {
                let appError = this.getApplicationError(error);
                if (!appError) {
                    console.warn('Received unknown error: retrying watch');

                    // Stop old watch
                    this.handlersMap.delete(currentId);
                    this.postQueryWatchEnd(currentId);

                    // Launch new watch
                    currentId = this.nextKey();
                    this.handlersMap.set(currentId, id);

                    // Schedule new watch
                    setTimeout(() => {
                        if (!completed) {
                            this.postQueryWatch(currentId, query, vars, params);
                        }
                    }, 1000);

                    return;
                } else {
                    watch.hasError = true;
                    watch.hasValue = false;
                    watch.value = undefined;
                    watch.error = appError;
                }
            } else {
                watch.hasError = false;
                watch.hasValue = true;
                watch.value = data;
                watch.error = undefined;
            }
            if (!resolved) {
                resolved = true;
                if (watch.hasError) {
                    reject();
                } else if (watch.hasValue) {
                    resolve();
                }
            }
            for (let i of callbacks.values()) {
                if (watch.hasError) {
                    i({ error: watch.error });
                } else if (watch.hasValue) {
                    i({ data: watch.value });
                }
            }
        });
        this.postQueryWatch(id, query, vars, params);
        return {
            subscribe: (handler: ((args: { data?: TQuery, error?: Error }) => void)) => {
                let cbid = randomKey();
                callbacks.set(cbid, handler);
                return () => {
                    callbacks.delete(cbid);
                };
            },
            currentResult: () => {
                if (watch.hasError) {
                    return ({ error: watch.error });
                } else if (watch.hasValue) {
                    return ({ data: watch.value });
                }
                return undefined;
            },
            result: () => {
                return promise;
            },
            destroy: () => {
                if (!completed) {
                    this.handlersMap.delete(currentId);
                    this.postQueryWatchEnd(currentId);
                }
            }
        };
    }

    //
    // Mutation
    //

    async mutate<TQuery, TVars>(query: string, vars?: TVars): Promise<TQuery> {
        while (true) {
            try {
                let id = this.nextKey();
                let res = this.registerPromiseHandler<TQuery>(id);
                this.postMutation(id, query, vars);
                return await res;
            } catch (e) {
                let appError = this.getApplicationError(e);
                if (appError) {
                    throw appError;
                } else {
                    console.warn('Unknown error during mutation');
                    console.warn(e);
                }
                await delay(1000);
            }
        }
    }

    //
    // Subscription
    //

    subscribe<TSubscription, TVars>(handler: GraphqlSubscriptionHandler<TSubscription>, subscription: string, vars?: TVars): GraphqlActiveSubscription {
        let destroyed = false;

        // Set Handler
        let id = this.nextKey();
        this.handlersMap.set(id, id);
        this.handlers.set(id, (data, error) => {
            if (destroyed) {
                return;
            }
            if (error) {
                let appErr = this.getApplicationError(error) || error;
                this.handlersMap.delete(id);
                this.handlers.delete(id);
                handler({ type: 'stopped', error: appErr });
                this.postUnsubscribe(id);
                destroyed = true;
            } else {
                handler({ type: 'message', message: data });
            }
        });

        // Subscribe
        this.postSubscribe(id, subscription, vars);

        return {
            destroy: () => {
                if (destroyed) {
                    return;
                }
                destroyed = true;
                this.handlersMap.delete(id);
                this.handlers.delete(id);
                this.postUnsubscribe(id);
            }
        };
    }

    //
    // Store
    // 

    async updateQuery<TQuery, TVars>(updater: (data: TQuery) => TQuery | null, query: string, vars?: TVars): Promise<boolean> {
        let r = await this.readQuery<TQuery, TVars>(query, vars);
        if (r) {
            let udpated = updater(r);
            if (udpated) {
                await this.writeQuery<TQuery, TVars>(r, query, vars);
                return true;
            }
        }
        return false;
    }

    async readQuery<TQuery, TVars>(query: string, vars?: TVars): Promise<TQuery> {
        let id = this.nextKey();
        let res = this.registerPromiseHandler<TQuery>(id);
        this.postReadQuery(id, query, vars);
        return await res;
    }

    async writeQuery<TQuery, TVars>(data: TQuery, query: string, vars?: TVars) {
        let id = this.nextKey();
        let res = this.registerPromiseHandler<void>(id);
        this.postWriteQuery(id, data, query, vars);
        await res;
    }

    //
    // Implementation
    //

    protected operationUpdated(id: string, data: any) {
        let realId = this.handlersMap.get(id);
        if (!realId) {
            return;
        }
        let handler = this.handlers.get(realId);
        if (handler) {
            handler(data, undefined);
        }
    }
    protected operationFailed(id: string, err: Error) {
        let realId = this.handlersMap.get(id);
        if (!realId) {
            return;
        }
        let handler = this.handlers.get(realId);
        if (handler) {
            handler(undefined, err);
        }
    }

    protected abstract postQuery<TVars>(id: string, query: string, vars?: TVars, params?: OperationParameters): void;
    protected abstract postQueryWatch<TVars>(id: string, query: string, vars?: TVars, params?: OperationParameters): void;
    protected abstract postQueryWatchEnd(id: string): void;

    protected abstract postMutation<TVars>(id: string, query: string, vars?: TVars): void;

    protected abstract postSubscribe<TVars>(id: string, query: string, vars?: TVars): void;
    protected abstract postSubscribeUpdate(id: string, vars: any): void;
    protected abstract postUnsubscribe(id: string): void;

    protected abstract postReadQuery<TVars>(id: string, query: string, vars?: TVars): void;
    protected abstract postWriteQuery<TVars>(id: string, data: any, query: string, vars?: TVars): void;

    private nextKey() {
        return randomKey();
    }

    private registerPromiseHandler<T>(id: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.handlersMap.set(id, id);
            this.handlers.set(id, (data, error) => {
                this.handlers.delete(id);
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }
}
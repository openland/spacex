import { GraphqlEngine, GraphqlEngineStatus, OperationParameters, GraphqlQueryWatch, GraphqlQueryResult, GraphqlSubscriptionHandler } from './GraphqlEngine';
import { Watcher } from './utils/Watcher';
import { backoff } from './utils/backoff';
import { randomKey } from './utils/randomKey';
import { delay } from './utils/delay';
import { exponentialBackoffDelay } from './utils/backoff';

export type RetryErrorHandler = (src: Error) => { type: 'error', error: Error } | { type: 'unknown' } | { type: 'retry', delay: number };

export class RetryEngine implements GraphqlEngine {

    // Status
    protected readonly statusWatcher: Watcher<GraphqlEngineStatus> = new Watcher();
    get status(): GraphqlEngineStatus {
        return this.statusWatcher.getState()!!;
    }
    watchStatus(handler: (status: GraphqlEngineStatus) => void) {
        return this.statusWatcher.watch(handler);
    }

    private inner: GraphqlEngine;
    private errorHandler: RetryErrorHandler;
    private minRetry: number;
    constructor(opts: {
        engine: GraphqlEngine,
        errorHandler: RetryErrorHandler,
        minRetry: number
    }) {
        this.errorHandler = opts.errorHandler;
        this.inner = opts.engine;
        this.minRetry = opts.minRetry;
        this.statusWatcher.setState(this.inner.status);
        this.inner.watchStatus((s) => {
            this.statusWatcher.setState(s);
        });
    }

    async query<TQuery, TVars>(query: string, vars?: TVars, params?: OperationParameters): Promise<TQuery> {
        let res = await backoff(async () => {
            while (true) {
                try {
                    let r = await this.inner.query<TQuery, TVars>(query, vars, params);
                    return { type: 'result', result: r };
                } catch (e) {
                    let processed = this.errorHandler(e);
                    if (processed.type === 'error') {
                        return { type: 'error', error: processed.error };
                    } else if (processed.type === 'unknown') {
                        console.warn(e);
                        throw e;
                    } else if (processed.type === 'retry') {
                        await delay(Math.max(this.minRetry, processed.delay));
                    }
                }
            }
        });
        if (res.type === 'result') {
            return res.result!;
        } else {
            throw res.error;
        }
    }
    async mutate<TMutation, TVars>(mutation: string, vars?: TVars): Promise<TMutation> {
        let res = await backoff(async () => {
            while (true) {
                try {
                    let r = await this.inner.mutate<TMutation, TVars>(mutation, vars);
                    return { type: 'result', result: r };
                } catch (e) {
                    let processed = this.errorHandler(e);
                    if (processed.type === 'error') {
                        return { type: 'error', error: processed.error };
                    } else if (processed.type === 'unknown') {
                        console.warn(e);
                        throw e;
                    } else if (processed.type === 'retry') {
                        await delay(Math.max(this.minRetry, processed.delay));
                    }
                }
            }
        });
        if (res.type === 'result') {
            return res.result!;
        } else {
            throw res.error;
        }
    }

    queryWatch<TQuery, TVars>(query: string, vars?: TVars, params?: OperationParameters): GraphqlQueryWatch<TQuery> {
        let destroyed = false;
        let currentWatch: GraphqlQueryWatch<TQuery> | undefined;
        let currentWatchSubscriber: (() => void) | undefined;
        let currentResult: GraphqlQueryResult<TQuery> | undefined;
        let currentFailureCount = 0;
        let callbacks = new Map<string, (args: { data?: TQuery, error?: Error }) => void>();
        let resolved = false;
        let resolve!: () => void;
        let reject!: () => void;
        let promise = new Promise<void>((rl, rj) => {
            resolve = rl;
            reject = rj;
        });

        let restart = (restartDelay: number) => {
            if (destroyed) {
                return;
            }

            // We need to destroy watch subscriptions and watch itself 
            // immediatelly to avoid double invokes of restart function
            if (currentWatchSubscriber) {
                currentWatchSubscriber();
                currentWatchSubscriber = undefined;
            }
            if (currentWatch) {
                currentWatch.destroy();
                currentWatch = undefined;
            }

            setTimeout(() => {
                // Start new queryu watch
                currentWatch = this.inner.queryWatch(query, vars, params);

                // Fetch cached value
                let cr = currentWatch.currentResult();
                if (cr) {

                    // Errors are impossible since we had zero event loop ticks since starting watch
                    // and error MUST be received from network.
                    // At most we could have initial value from cache
                    if (cr.error) {
                        throw Error('Initial result can\'t be error!');
                    }

                    // Save and notify first value
                    currentResult = cr;

                    // Resolve start promise if needed
                    if (!resolved) {
                        resolved = true;
                        currentFailureCount = 0;
                        resolve();
                    }

                    for (let i of callbacks.values()) {
                        i(currentResult);
                    }
                }

                // Start watch subscriber
                currentWatchSubscriber = currentWatch.subscribe((u) => {
                    if (destroyed) {
                        return;
                    }
                    if (u.error) {
                        let processed = this.errorHandler(u.error);

                        if (processed.type === 'error') {
                            currentFailureCount = 0;
                            currentResult = { error: processed.error };
                            if (!resolved) {
                                resolved = true;
                                reject();
                            }
                            for (let i of callbacks.values()) {
                                i(currentResult);
                            }
                        } else if (processed.type === 'unknown') {
                            if (currentFailureCount < 50) {
                                currentFailureCount++;
                            }
                            let retryDelay = exponentialBackoffDelay(currentFailureCount, 1000, 5000, 50);
                            restart(Math.max(this.minRetry, retryDelay));
                        } else if (processed.type === 'retry') {
                            currentFailureCount = 0;
                            restart(Math.max(this.minRetry, processed.delay));
                        }
                    } else {
                        currentFailureCount = 0;
                        currentResult = u;
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                        for (let i of callbacks.values()) {
                            i(currentResult);
                        }
                    }
                });
            }, restartDelay);
        };
        restart(10);

        return {
            subscribe: (handler: ((args: { data?: TQuery, error?: Error }) => void)) => {
                let cbid = randomKey();
                callbacks.set(cbid, handler);
                return () => {
                    callbacks.delete(cbid);
                };
            },
            currentResult: () => {
                return currentResult;
            },
            result: () => {
                return promise;
            },
            destroy: () => {
                if (!destroyed) {
                    destroyed = true;
                    if (currentWatchSubscriber) {
                        currentWatchSubscriber();
                        currentWatchSubscriber = undefined;
                    }
                    if (currentWatch) {
                        currentWatch.destroy();
                        currentWatch = undefined;
                    }
                }
            }
        };
    }

    subscribe<TSubscription, TVars>(handler: GraphqlSubscriptionHandler<TSubscription>, subscription: string, vars?: TVars) {
        return this.inner.subscribe<TSubscription, TVars>(handler, subscription, vars);
    }
    updateQuery<TQuery, TVars>(updater: (data: TQuery) => TQuery | null, query: string, vars?: TVars) {
        return this.inner.updateQuery<TQuery, TVars>(updater, query, vars);
    }
    readQuery<TQuery, TVars>(query: string, vars?: TVars) {
        return this.inner.readQuery<TQuery, TVars>(query, vars);
    }
    writeQuery<TQuery, TVars>(data: TQuery, query: string, vars?: TVars) {
        return this.inner.writeQuery<TQuery, TVars>(data, query, vars);
    }

    close() {
        this.inner.close();
    }
}
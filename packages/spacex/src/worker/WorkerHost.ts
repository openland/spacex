import { Serializer } from './Serializer';
import { WorkerRequest, WorkerResponse } from './WorkerApi';
import { WorkerInterface } from './WorkerApi';
import { GraphqlEngine, GraphqlActiveSubscription } from './../GraphqlEngine';
import { randomKey } from '../utils/randomKey';

export class WorkerHost {
    private worker: WorkerInterface;
    private engine: GraphqlEngine;
    private watches = new Map<string, () => void>();
    private subscriptions = new Map<string, GraphqlActiveSubscription<any, {}>>();

    constructor(opts: {
        engine: GraphqlEngine,
        worker: WorkerInterface
    }) {
        this.worker = opts.worker;
        this.engine = opts.engine;

        this.engine.watchStatus((status) => {
            this.postMessage({ id: randomKey(), type: 'status', status: status.status });
        });
        this.worker.setHandler((msg) => {
            this.handleMessage(msg);
        });
    }

    private handleMessage = (msg: WorkerRequest) => {
        if (msg.type === 'query') {
            this.engine.query(msg.query, msg.variables, msg.params).then((v) => {
                this.postResult(msg.id, v);
            }).catch((v) => {
                this.postError(msg.id, v);
            });
        } else if (msg.type === 'mutate') {
            this.engine.mutate(msg.mutation, msg.variables).then((v) => {
                this.postResult(msg.id, v);
            }).catch((v) => {
                this.postError(msg.id, v);
            });
        } else if (msg.type === 'read') {
            this.engine.readQuery(msg.query, msg.variables).then((v) => {
                this.postResult(msg.id, v);
            }).catch((v) => {
                this.postError(msg.id, v);
            });
        } else if (msg.type === 'write') {
            this.engine.writeQuery(msg.data, msg.query, msg.variables).then((v) => {
                this.postResult(msg.id, v);
            }).catch((v) => {
                this.postError(msg.id, v);
            });
        } else if (msg.type === 'watch') {
            let id = msg.id;
            let watch = this.engine.queryWatch(msg.query, msg.variables, msg.params);
            let current = watch.currentResult();
            if (current) {
                if (current.error) {
                    this.postError(id, current.error);
                } else if (current.data) {
                    this.postResult(id, current.data);
                }
            }
            let res = watch.subscribe(({ data, error }) => {
                if (error) {
                    this.postError(id, error);
                } else {
                    this.postResult(id, data);
                }
            });
            this.watches.set(msg.id, res);
        } else if (msg.type === 'watch-destroy') {
            if (this.watches.has(msg.id)) {
                this.watches.get(msg.id)!!();
                this.watches.delete(msg.id);
            }
        } else if (msg.type === 'subscribe') {
            let id = msg.id;
            let subscription = this.engine.subscribe(msg.subscription, msg.variables);
            this.subscriptions.set(id, subscription);
            (async () => {
                while (true) {
                    let v = await subscription.get();
                    this.postResult(id, v);
                }
            })();
        } else if (msg.type === 'subscribe-update') {
            this.subscriptions.get(msg.id)!!.updateVariables(msg.variables);
        } else if (msg.type === 'subscribe-destroy') {
            this.subscriptions.get(msg.id)!!.destroy();
            this.subscriptions.delete(msg.id);
        }
    }

    private postResult(id: string, data: any) {
        this.postMessage({ id: id, type: 'result', data });
    }
    private postError(id: string, error: any) {
        this.postMessage({ type: 'error', id: id, data: Serializer.serializeError(error) });
    }
    private postMessage = (msg: WorkerResponse) => {
        this.worker.post(msg);
    }
}
import { Serializer } from './Serializer';
import { WorkerInterface, WorkerResponse, WorkerRequest } from './WorkerApi';
import { GraphqlBridgedEngine } from "../GraphqlBridgedEngine";
import { OperationParameters } from '../GraphqlEngine';

export class WorkerEngine extends GraphqlBridgedEngine {
    private readonly worker: WorkerInterface;

    constructor(opts: {
        worker: WorkerInterface
    }) {
        super();
        this.worker = opts.worker;
        this.worker.setHandler((msg: any) => {
            this.handleMessage(msg);
        });
    }

    close() {
        throw new Error('not yet implemented');
    }

    protected postQuery(id: string, query: string, vars: any, params?: OperationParameters) {
        this.postMessage({ type: 'query', id, query: query, variables: vars, params });
    }
    protected postQueryWatch(id: string, query: string, vars: any, params?: OperationParameters) {
        this.postMessage({ type: 'watch', id, query: query, variables: vars, params });
    }
    protected postQueryWatchEnd(id: string) {
        this.postMessage({ type: 'watch-destroy', id });
    }

    protected postMutation(id: string, mutation: string, vars: any) {
        this.postMessage({ type: 'mutate', id, mutation: mutation, variables: vars });
    }

    protected postSubscribe(id: string, subscription: string, vars: any) {
        this.postMessage({ type: 'subscribe', id, subscription: subscription, variables: vars });
    }
    protected postSubscribeUpdate(id: string, vars: any) {
        this.postMessage({ type: 'subscribe-update', id, variables: vars });
    }
    protected postUnsubscribe(id: string) {
        this.postMessage({ type: 'subscribe-destroy', id });
    }

    protected postReadQuery(id: string, query: string, vars: any) {
        this.postMessage({ type: 'read', id, query: query, variables: vars });
    }
    protected postWriteQuery(id: string, data: any, query: string, vars: any) {
        this.postMessage({ type: 'write', id, query: query, variables: vars, data });
    }

    private handleMessage(msg: WorkerResponse) {
        if (msg.type === 'result') {
            this.operationUpdated(msg.id, msg.data);
        } else if (msg.type === 'error') {
            this.operationFailed(msg.id, Serializer.parseError(msg.data));
        } else if (msg.type === 'status') {
            this.statusWatcher.setState({ status: msg.status as any });
        }
    }

    private postMessage(request: WorkerRequest) {
        this.worker.post(request);
    }
}

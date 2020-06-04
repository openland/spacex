import { SubscriptionParameters } from './../GraphqlEngine';
import { PriorityContext } from './../PriorityContext';
import { Serializer } from './Serializer';
import { WorkerInterface, WorkerResponse, WorkerRequest } from './WorkerApi';
import { GraphqlBridgedEngine } from "../GraphqlBridgedEngine";
import { QueryParameters, QueryWatchParameters, MutationParameters } from '../GraphqlEngine';

function resolvePriority(src: PriorityContext | number | undefined | null) {
    if (src !== null && src !== undefined) {
        if (typeof src === 'number') {
            return src;
        } else {
            return src.priority;
        }
    }
    return undefined;
}

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

    protected postQuery(id: string, query: string, vars: any, params?: QueryParameters) {
        this.postMessage({ type: 'query', id, query: query, variables: vars, params: { ...params, priority: resolvePriority(params ? params.priority : undefined) } });
    }
    protected postQueryWatch(id: string, query: string, vars: any, params?: QueryWatchParameters) {
        this.postMessage({ type: 'watch', id, query: query, variables: vars, params: { ...params, priority: resolvePriority(params ? params.priority : undefined) } });
    }
    protected postQueryWatchEnd(id: string) {
        this.postMessage({ type: 'watch-destroy', id });
    }

    protected postMutation(id: string, mutation: string, vars: any, params?: MutationParameters) {
        this.postMessage({ type: 'mutate', id, mutation: mutation, variables: vars, params: { ...params, priority: resolvePriority(params ? params.priority : undefined) } });
    }

    protected postSubscribe(id: string, subscription: string, vars: any, params?: SubscriptionParameters) {
        this.postMessage({ type: 'subscribe', id, subscription: subscription, variables: vars, params: { ...params, priority: resolvePriority(params ? params.priority : undefined) } });
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

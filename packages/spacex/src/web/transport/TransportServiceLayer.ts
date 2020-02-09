import { WebEngineOpts } from './../WebEngine';
import { GraphqlEngineStatus } from './../../GraphqlEngine';
import { StableSocket, StableApolloSocket } from './StableSocket';
import { OperationDefinition } from './../types';
import { TransportResult } from './WebTransport';

type PendingOperation = { id: string, reqiestId: string, operation: OperationDefinition, variables: any, callback: (result: TransportResult) => void };

export class TransportServiceLayer {
    private nextId = 1;
    private readonly liveOperations = new Map<string, PendingOperation>();
    private readonly liveOperationsIds = new Map<string, string>();
    private readonly socket: StableSocket<any>;
    onStatusChanged: ((status: GraphqlEngineStatus) => void) | null = null;

    constructor(opts: WebEngineOpts) {
        this.socket = new StableApolloSocket(opts);
        this.socket.onConnected = () => {
            if (opts.logging) {
                console.log('[TX] Connected');
            }
            if (this.onStatusChanged) {
                this.onStatusChanged({ status: 'connected' });
            }
        };
        this.socket.onDisconnected = () => {
            if (opts.logging) {
                console.log('[TX] Disconnected');
            }
            if (this.onStatusChanged) {
                this.onStatusChanged({ status: 'connecting' });
            }
        };

        // Operation Callbacks
        this.socket.onReceiveData = (id, msg) => {
            let rid = this.liveOperationsIds.get(id);
            if (rid) {
                let op = this.liveOperations.get(rid);
                if (op) {
                    op.callback({ type: 'result', value: msg });
                    if (op.operation.kind === 'query' || op.operation.kind === 'mutation') {
                        this.liveOperations.delete(rid);
                        this.liveOperationsIds.delete(id);
                    }
                }
            }
        };
        this.socket.onReceiveError = (id, errors) => {
            let rid = this.liveOperationsIds.get(id);
            if (rid) {
                let op = this.liveOperations.get(rid);
                if (op) {
                    this.liveOperations.delete(rid);
                    this.liveOperationsIds.delete(id);
                    op.callback({ type: 'error', errors: errors });
                }
            }
        };
        this.socket.onReceiveCompleted = (id) => {
            let rid = this.liveOperationsIds.get(id);
            if (rid) {
                let op = this.liveOperations.get(rid);
                if (op) {
                    this.liveOperations.delete(rid);
                    this.liveOperationsIds.delete(id);
                    op.callback({ type: 'completed' });
                }
            }
        };
        // this.socket.onReceiveTryAgain = (id, delay) => {
        //     let rid = this.liveOperationsIds.get(id);
        //     if (rid) {
        //         let op = this.liveOperations.get(rid);
        //         if (op) {

        //             // Stop Existing
        //             this.flushQueryStop(op);

        //             // Regenerate ID
        //             let nid = (this.nextId++).toString();
        //             op.reqiestId = nid;
        //             this.liveOperationsIds.delete(id);
        //             this.liveOperationsIds.set(nid, id);

        //             // Schedule restart
        //             setTimeout(() => {
        //                 if (this.liveOperationsIds.has(nid)) {
        //                     this.flushQueryStart(op!);
        //                 }
        //             }, delay);
        //         }
        //     }
        // };

        this.socket.onSessionLost = () => {
            if (opts.logging) {
                console.log('[TX] Session lost');
            }
            for (let op of Array.from(this.liveOperations.values()) /* I am not sure if i can iterate and delete from map */) {

                if (op.operation.kind === 'subscription') {
                    // Stop subscriptions
                    this.liveOperations.delete(op.id);
                    this.liveOperationsIds.delete(op.reqiestId);
                    op.callback({ type: 'completed' });
                } else {
                    // Retry query and mutation
                    this.flushQueryStart(op);
                }
            }
        };
        this.socket.connect();
    }

    operation = (operation: OperationDefinition, variables: any, callback: (result: TransportResult) => void) => {
        let id = (this.nextId++).toString();
        let op: PendingOperation = { id: id, reqiestId: id, operation, variables, callback };
        this.liveOperations.set(id, op);
        this.liveOperationsIds.set(id, id);

        this.flushQueryStart(op);

        return () => {
            if (this.liveOperations.has(id)) {
                this.liveOperations.delete(id);
                this.liveOperationsIds.delete(op.reqiestId);
                this.flushQueryStop(op);
            }
        };
    }

    private flushQueryStart(op: PendingOperation) {
        this.socket.post(op.reqiestId, {
            query: op.operation.body,
            name: op.operation.name,
            variables: op.variables
        });
    }

    private flushQueryStop(op: PendingOperation) {
        this.socket.cancel(op.reqiestId);
    }
}
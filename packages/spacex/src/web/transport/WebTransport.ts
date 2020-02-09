import { WebEngineOpts } from './../WebEngine';
import { GraphqlEngineStatus } from '../../GraphqlEngine';
import { TransportServiceLayer } from './TransportServiceLayer';
import { OperationDefinition } from '../types';

export type TransportResult = { type: 'result', value: any } | { type: 'error', errors: any[] } | { type: 'completed' };

export class WebTransport {

    private readonly opts: WebEngineOpts
    private readonly serviceLayer: TransportServiceLayer;
    onStatusChanged: ((status: GraphqlEngineStatus) => void) | null = null;

    constructor(opts: WebEngineOpts) {
        this.opts = opts;
        this.serviceLayer = new TransportServiceLayer(opts);
        this.serviceLayer.onStatusChanged = (status) => {
            if (this.onStatusChanged) {
                this.onStatusChanged(status);
            }
        };
    }

    operation = async (operation: OperationDefinition, vars: any): Promise<TransportResult> => {
        let completed = false;
        return await new Promise<TransportResult>((resolve, reject) => this.serviceLayer.operation(operation, vars, (res) => {
            // Errors will be handled somewhere else
            if (res.type === 'result' || res.type === 'error') {
                if (!completed) {
                    completed = true;
                    resolve(res);
                }
            }
        }));
    }

    subscription = (operation: OperationDefinition, vars: any, callback: (result: TransportResult) => void): (() => void) => {
        return this.serviceLayer.operation(operation, vars, callback);
    }
}

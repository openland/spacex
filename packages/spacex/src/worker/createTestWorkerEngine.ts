import { WorkerEngine } from './WorkerEngine';
import { WorkerHost } from './WorkerHost';
import { GraphqlEngine } from '../GraphqlEngine';
import { WorkerInterface } from './WorkerApi';

export function createTestWorkerEngine(engine: GraphqlEngine) {

    let hostCallback!: (src: any) => void;
    let clientCallback!: (src: any) => void;

    let hostWorkerInterface: WorkerInterface = {
        post: (src) => {
            let conv = JSON.parse(JSON.stringify(src));
            // console.log('<<<', conv);
            setTimeout(() => clientCallback(conv), 1);
        },
        setHandler: (handler) => hostCallback = handler
    };
    let clientWorkerInterface: WorkerInterface = {
        post: (src) => {
            let conv = JSON.parse(JSON.stringify(src));
            // console.log('>>>', conv);
            setTimeout(() => hostCallback(conv), 1);
        },
        setHandler: (handler) => clientCallback = handler
    };

    // tslint:disable-next-line
    let host = new WorkerHost({
        worker: hostWorkerInterface,
        engine: engine,
    });
    return new WorkerEngine({
        worker: clientWorkerInterface
    });
}
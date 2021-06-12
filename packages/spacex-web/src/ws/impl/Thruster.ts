import { WebSocketConnection, WebSocketProvider } from '../WebSocketProvider';

export type ThrusterConfig<T> = { endpoint: T, timeout: number };

/**
 * This class provides a factory for rapid WebSocket connection establishing by using several 
 * parallel attempts with different settings. First success wins.
 */
export class Thruster<T> {
    readonly configs: ThrusterConfig<T>[];
    readonly onSuccess: (socket: WebSocketConnection) => void;

    private provider: WebSocketProvider<T>;
    private bucketSockets: (WebSocketConnection | null)[] = [];
    private bucketTimeout: any[] = [];
    private closed = false;

    constructor(opts: {
        provider: WebSocketProvider<T>,
        configs: ThrusterConfig<T>[],
        onSuccess: (socket: WebSocketConnection) => void
    }) {
        this.provider = opts.provider;
        this.configs = opts.configs;
        this.onSuccess = opts.onSuccess;

        for (let i = 0; i < opts.configs.length; i++) {
            this.bucketSockets.push(null);
            this.bucketTimeout.push(null);
        }

        for (let i = 0; i < opts.configs.length; i++) {
            this.restartBucket(i);
        }
    }

    private restartBucket = (bucket: number) => {
        const timeout = this.configs[bucket].timeout;
        const endpoint = this.configs[bucket].endpoint;

        // Close existing
        if (this.bucketSockets[bucket]) {
            let ex = this.bucketSockets[bucket]!;
            this.bucketSockets[bucket] = null;
            ex.onclose = null;
            ex.onopen = null;
            ex.onmessage = null;
            ex.close();
        }

        // Clear timeout
        if (this.bucketTimeout[bucket]) {
            clearTimeout(this.bucketTimeout[bucket]);
            this.bucketTimeout[bucket] = null;
        }

        const ws = this.provider.create(endpoint, { connectionTimeout: timeout + 1000 });
        this.bucketSockets[bucket] = ws;
        ws.onopen = () => {

            // Remove socket from buckets to avoid it's shutdown
            this.bucketSockets[bucket] = null;

            // Close all other sockets
            try {
                this.close();
            } catch (e) {
                // Ignore
            }

            // Remove callbacks and invoke onSuccess callback
            ws.onopen = null;
            ws.onclose = null;
            this.onSuccess(ws);
        };

        ws.onclose = () => {
            if (this.bucketTimeout[bucket]) {
                clearTimeout(this.bucketTimeout[bucket]);
                this.bucketTimeout[bucket] = null;
            }
            this.bucketTimeout[bucket] = setTimeout(() => {
                this.restartBucket(bucket);
            }, 3000);
        };

        this.bucketTimeout[bucket] = setTimeout(() => {
            this.restartBucket(bucket);
        }, timeout);
    }

    close = () => {
        if (this.closed) {
            return;
        }
        this.closed = true;

        for (let i = 0; i < this.configs.length; i++) {

            // Close Socket
            let ex = this.bucketSockets[i];
            this.bucketSockets[i] = null;
            if (ex) {
                ex.onclose = null;
                ex.onopen = null;
                ex.onmessage = null;
                ex.close();
            }

            // Clear Timeout
            if (this.bucketTimeout[i]) {
                clearTimeout(this.bucketTimeout[i]);
                this.bucketTimeout[i] = null;
            }
        }
    }
}
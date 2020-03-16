import { WebSocketConnection, WebSocketEngine, DefaultWebSocketEngine } from './../WebSocketEngine';

export type ThrusterConfig = { url: string, timeout: number };

/**
 * This class provides a factory for rapid WebSocket connection establishing by using several 
 * parallel attempts with different settings. First success wins.
 */
export class Thruster {
    readonly configs: ThrusterConfig[];
    readonly onSuccess: (socket: WebSocketConnection) => void;
    readonly protocol?: string;

    private engine: WebSocketEngine;
    private bucketSockets: (WebSocketConnection | null)[] = [];
    private bucketTimeout: any[] = [];
    private closed = false;

    constructor(opts: {
        engine?: WebSocketEngine,
        configs: ThrusterConfig[],
        protocol?: string,
        onSuccess: (socket: WebSocketConnection) => void
    }) {
        this.engine = opts.engine || DefaultWebSocketEngine;
        this.configs = opts.configs;
        this.onSuccess = opts.onSuccess;
        this.protocol = opts.protocol;

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
        const url = this.configs[bucket].url;

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

        const ws = this.engine.create(url, this.protocol);
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
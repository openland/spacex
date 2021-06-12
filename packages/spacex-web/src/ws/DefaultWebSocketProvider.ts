import WebSocket from 'isomorphic-ws';
import { WebSocketProvider, WebSocketConnection, WebSocketConnectionOpts } from './WebSocketProvider';

const empty = () => { /* */ };

export type DefaultWebSocketProviderOpts = {
    connectionTimeout: number;
    logging?: boolean;
};

let nextConnectionID = 1;
class DefaultWebSocketConnection implements WebSocketConnection {
    readonly id: number = nextConnectionID++;
    private _ws: WebSocket;
    private _state: 'connecting' | 'open' | 'closed' = 'connecting';
    private _opts: WebSocketConnectionOpts;
    private _popts: DefaultWebSocketProviderOpts;
    private _connectionTimer: any | null;

    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((message: string) => void) | null = null;

    constructor(ws: WebSocket, opts: WebSocketConnectionOpts, popts: DefaultWebSocketProviderOpts) {
        this._ws = ws;
        this._opts = opts;
        this._popts = popts;
        if (this._popts.logging) {
            console.log(`[WS/${this.id}]: Connecting...`);
        }
        this._ws.onopen = () => {
            if (this._state === 'connecting') {
                this._state = 'open';
                if (this._popts.logging) {
                    console.log(`[WS/${this.id}]: Open`);
                }
                clearTimeout(this._connectionTimer);
                if (this.onopen) {
                    this.onopen();
                }
            }
        };
        this._ws.onmessage = (src) => {
            if (this._state === 'open') {
                if (typeof src.data === 'string') {
                    if (this.onmessage) {
                        this.onmessage(src.data);
                    }
                }
            }
        };
        this._ws.onclose = () => {
            if (this._popts.logging) {
                console.log(`[WS/${this.id}]: onclose called`);
            }
            this.doClose(true);
        };
        this._ws.onerror = () => {
            if (this._popts.logging) {
                console.log(`[WS/${this.id}]: onerror called`);
            }
            this.doClose(true);
        };
        if ((this._ws as any).on) {
            (this._ws as any).on('error', () => {
                if (this._popts.logging) {
                    console.log(`[WS/${this.id}]: on('error') called`);
                }
                this.doClose(true);
            });
        }
        this._connectionTimer = setInterval(() => {
            if (this._popts.logging) {
                console.log(`[WS/${this.id}]: connection timeout timer fired`);
            }
            this.doClose(true);
        }, opts.connectionTimeout);
    }

    send(message: string) {
        if (this._state === 'closed') {
            return;
        }
        if (this._state !== 'open') {
            throw Error('Socket is not connected');
        }
        this._ws.send(message);
    }

    close() {
        if (this._popts.logging) {
            console.log(`[WS/${this.id}]: close called`);
        }
        this.doClose(false);
    }

    private doClose(notify: boolean) {
        if (this._state !== 'closed') {
            if (this._popts.logging) {
                console.log(`[WS/${this.id}]: closed`);
            }
            this._state = 'closed';
            clearTimeout(this._connectionTimer);
            this._ws.onclose = empty;
            this._ws.onopen = empty;
            this._ws.onmessage = empty;
            try {
                this._ws.close();
            } catch (e) {
                // Ignore
            }
            if (notify) {
                if (this.onclose) {
                    this.onclose();
                }
            }
        }
    }
}

export class DefaultWebSocketProvider implements WebSocketProvider<{ url: string, protocol?: string }> {
    readonly opts: DefaultWebSocketProviderOpts;
    constructor(opts: DefaultWebSocketProviderOpts) {
        this.opts = opts;
    }
    create(connectionParams: { url: string, protocol?: string }, opts: WebSocketConnectionOpts): WebSocketConnection {
        return new DefaultWebSocketConnection(new WebSocket(connectionParams.url, connectionParams.protocol), opts, this.opts);
    }
}
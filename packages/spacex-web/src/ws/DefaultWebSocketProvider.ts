import WebSocket from 'isomorphic-ws';
import { WebSocketProvider, WebSocketConnection } from './WebSocketProvider';

const empty = () => { /* */ };

class DefaultWebSocketConnection implements WebSocketConnection {
    private _ws: WebSocket;
    private _state: 'connecting' | 'open' | 'closed' = 'connecting';

    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((message: string) => void) | null = null;

    constructor(ws: WebSocket) {
        this._ws = ws;
        this._ws.onopen = () => {
            if (this._state === 'connecting') {
                this._state = 'open';
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
            this.close();
        };
        this._ws.onerror = () => {
            this.close();
        };
        if ((this._ws as any).on) {
            (this._ws as any).on('error', () => {
                this.close();
            });
        }
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
        if (this._state !== 'closed') {
            this._state = 'closed';
            this._ws.onclose = empty;
            this._ws.onopen = empty;
            this._ws.onmessage = empty;
            try {
                this._ws.close();
            } catch (e) {
                // Ignore
            }
        }
    }
}

export class DefaultWebSocketProvider implements WebSocketProvider<{ url: string, protocol?: string }> {
    create(connectionParams: { url: string, protocol?: string }): WebSocketConnection {
        return new DefaultWebSocketConnection(new WebSocket(connectionParams.url, connectionParams.protocol));
    }
}
import WebSocket from 'isomorphic-ws';

export interface WebSocketEngine {
    create(url: string, protocol?: string): WebSocketConnection;
}

export interface WebSocketConnection {
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((message: string) => void) | null;
    send(message: string): void;
    close(): void;
}

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
        }
        this._ws.onclose = () => {
            this.close();
        };
        this._ws.onerror = () => {
            this.close();
        };
        if (this._ws.on) {
            this._ws.on('error', () => {
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

export const DefaultWebSocketEngine: WebSocketEngine = {
    create(url: string, protocol?: string) {
        return new DefaultWebSocketConnection(new WebSocket(url, protocol));
    }
}
import { Thruster, ThrusterConfig } from './impl/Thruster';
import { WebSocketProvider, WebSocketConnection, WebSocketConnectionOpts } from './WebSocketProvider';

class ThrustedWebSocketConnection<T> implements WebSocketConnection {

    private thruster: Thruster<T>;
    private _stopped = false;
    private _started = false;
    private _connection: WebSocketConnection | null = null;
    private _opts: ThrustedWebSocketProviderOpts;

    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((msg: string) => void) | null = null;

    constructor(inner: WebSocketProvider<T>, endpoint: T, opts: ThrustedWebSocketProviderOpts) {
        this._opts = opts;
        let configs: ThrusterConfig<T>[] = [];
        for (let b of opts.buckets) {
            configs.push({ endpoint: endpoint, timeout: b });
        }

        this.thruster = new Thruster({
            provider: inner,
            configs,
            onSuccess: (connection) => {
                if (this._stopped) {
                    return;
                }
                if (this._started) {
                    return;
                }
                this._started = true;
                this._connection = connection;
                connection.onmessage = (msg) => {
                    if (!this._stopped) {
                        if (this.onmessage) {
                            this.onmessage(msg);
                        }
                    }
                };
                connection.onclose = () => {
                    if (!this._stopped) {
                        this._stopped = true;
                        if (this.onclose) {
                            this.onclose();
                        }
                    }
                };
                if (this.onopen) {
                    this.onopen();
                }
            }
        });
    }

    send(message: string): void {
        // Ignore for stopped
        if (this._stopped) {
            return;
        }
        // Throw if not started
        if (!this._started) {
            throw Error('Not started');
        }
        this._connection!.send(message);
    }

    close(): void {
        if (this._stopped) {
            return;
        }
        if (!this._started) {
            this.thruster.close();
        } else {
            this._connection!.close();
        }
        this._stopped = true;
    }
}

export type ThrustedWebSocketProviderOpts = {
    buckets: number[];
    logging?: boolean;
};

export class ThrustedWebSocketProvider<T> implements WebSocketProvider<T> {
    private readonly inner: WebSocketProvider<T>;
    private readonly opts: ThrustedWebSocketProviderOpts;

    constructor(inner: WebSocketProvider<T>, opts: ThrustedWebSocketProviderOpts) {
        this.inner = inner;
        this.opts = opts;
    }

    create(endpoint: T, opts: WebSocketConnectionOpts): WebSocketConnection {
        return new ThrustedWebSocketConnection<T>(this.inner, endpoint, this.opts);
    }
}
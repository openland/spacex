import { WatchDogTimer } from './impl/WatchDogTimer';
import { WebSocketConnection, WebSocketConnectionOpts, WebSocketProvider } from './WebSocketProvider';

class WatchDogConnection implements WebSocketConnection {

    private readonly _opts: WatchDogProviderOpts;
    private readonly _inner: WebSocketConnection;
    private watchDog: WatchDogTimer | null = null;
    private _started = false;
    private _stopped = false;

    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((msg: string) => void) | null = null;

    constructor(inner: WebSocketConnection, opts: WatchDogProviderOpts) {
        this._inner = inner;
        this._opts = opts;
        this._inner.onopen = () => {
            if (this._started) {
                throw Error('Already started');
            }
            if (this._stopped) {
                throw Error('Already stopped');
            }
            this._started = true;

            // Start watchdog
            this.watchDog = new WatchDogTimer(this._opts.timeout, () => {
                this._inner.close();
            });
            this.watchDog.reset();

            // Invoke handler
            if (this.onopen) {
                this.onopen();
            }
        };

        this._inner.onclose = () => {
            if (this._stopped) {
                throw Error('Already stopped');
            }
            this._stopped = true;

            // Kill watchdog
            if (this._started) {
                this.watchDog!.kill();
            }

            // Invoke handler
            if (this.onclose) {
                this.onclose();
            }
        };

        this._inner.onmessage = (msg) => {
            if (!this._started || this._stopped) {
                throw Error('Connection stopped');
            }

            // Renew watchdog
            this.watchDog!.kick();

            // Invoke handler
            if (this.onmessage) {
                this.onmessage(msg);
            }
        };
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
        this._inner.send(message);
    }

    close(): void {
        // Ignore for stopped
        if (this._stopped) {
            return;
        }
        this._stopped = true;

        // Stop inner
        this._inner.close();
    }
}

export type WatchDogProviderOpts = {
    timeout: number;
    logging?: boolean;
};

export class WatchDogProvider<T> implements WebSocketProvider<T> {
    readonly inner: WebSocketProvider<T>;
    readonly opts: WatchDogProviderOpts;

    constructor(inner: WebSocketProvider<T>, opts: WatchDogProviderOpts) {
        this.opts = opts;
        this.inner = inner;
    }

    create(endpoint: T, opts: WebSocketConnectionOpts): WebSocketConnection {
        return new WatchDogConnection(this.inner.create(endpoint, opts), this.opts);
    }
}
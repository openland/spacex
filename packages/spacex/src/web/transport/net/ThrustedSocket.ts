import { WebSocketConnection, WebSocketEngine } from './../WebSocketEngine';
import { WatchDogTimer } from './WatchDogTimer';
import { Thruster } from './Thruster';

const empty = () => { /* */ };

const CONNECTION_BUCKETS = [1000, 5000, 30000];

export class ThrustedSocket {

    readonly url: string;
    readonly timeout: number;

    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((msg: string) => void) | null = null;

    private thruster: Thruster;
    private socket: WebSocketConnection | null = null;
    private watchDog: WatchDogTimer | null = null;
    private closed = false;

    constructor(opts: {
        url: string,
        timeout: number,
        protocol?: string,
        engine?: WebSocketEngine
    }) {
        this.url = opts.url;
        this.timeout = opts.timeout;
        this.thruster = new Thruster({
            configs: CONNECTION_BUCKETS.map((v) => ({ url: opts.url, timeout: v })),
            onSuccess: this.onConnected,
            engine: opts.engine,
            protocol: opts.protocol
        });
    }

    private onConnected = (socket: WebSocketConnection) => {
        this.watchDog = new WatchDogTimer(this.timeout, this.onConnectionDied);
        this.socket = socket;
        this.watchDog.reset();

        socket.onclose = () => {
            this.onConnectionDied();
        };
        socket.onmessage = (src) => {
            if (!this.closed) {
                if (this.onmessage) {
                    this.onmessage(src);
                }
            }
            if (this.watchDog) {
                this.watchDog.kick();
            }
        };
        if (this.onopen) {
            this.onopen();
        }
    }

    private onConnectionDied = () => {
        if (!this.closed) {
            this.closed = true;
            if (this.socket) {
                this.socket.onmessage = empty;
                this.socket.onclose = empty;
                this.socket.onopen = empty;
                try {
                    this.socket.close();
                } catch (e) {
                    // Ignore
                }
                this.socket = null;
            }
            if (this.watchDog) {
                this.watchDog.kill();
                this.watchDog = null;
            }
            if (this.onclose) {
                this.onclose();
            }
        }
    }

    send = (msg: string) => {
        if (this.socket) {
            this.socket.send(msg);
        } else {
            if (!this.closed) {
                throw Error('Socket is not connected yet');
            }
        }
    }

    close = () => {
        if (this.closed) {
            return;
        }
        this.closed = true;

        // Stop Thruster
        this.thruster.close();

        // Stop Socket
        if (this.socket) {
            this.socket.onmessage = empty;
            this.socket.onclose = empty;
            this.socket.onopen = empty;
            try {
                this.socket.close();
            } catch (e) {
                // Ignore
            }
            this.socket = null;
        }

        // Stop Watch Dog
        if (this.watchDog) {
            this.watchDog.kill();
            this.watchDog = null;
        }
    }
}
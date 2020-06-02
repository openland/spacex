import { WebEngineOpts } from '../WebEngine';
import { GraphqlUnknownError } from '../../GraphqlError';
import { ThrustedSocket } from './net/ThrustedSocket';
import { TransportLayer } from './TransportLayer';

const APOLLO_SOCKET_TIMEOUT = 10000;
const OPENLAND_SOCKET_TIMEOUT = 5000;
const PING_INTERVAL = 1000;

export class ApolloTransportLayer implements TransportLayer {
    private readonly opts: WebEngineOpts;

    onReceiveData: ((id: string, message: any) => void) | null = null;
    onReceiveError: ((id: string, error: any[]) => void) | null = null;
    onReceiveCompleted: ((id: string) => void) | null = null;

    onSessionLost: (() => void) | null = null;
    onConnected: (() => void) | null = null;
    onDisconnected: (() => void) | null = null;

    private pingTimeout: any;
    private state: 'waiting' | 'connecting' | 'starting' | 'started' | 'completed' = 'waiting';
    private pending = new Map<string, any>();
    private isStarted = false;
    private isStopped = false;
    private client: ThrustedSocket | null = null;

    constructor(opts: WebEngineOpts) {
        this.opts = opts;
    }

    request(id: string, message: { id: string, name: string, query: string, variables: any }) {
        if (this.state === 'waiting' || this.state === 'connecting') {

            // Add to pending buffer if we are not connected already
            this.pending.set(id, message);
        } else if (this.state === 'starting') {

            // If we connected, but not started add to pending buffer (in case of failed start)
            // and send message to socket
            this.pending.set(id, message);

            this.writeToSocket({
                type: 'start',
                'id': id,
                'payload': {
                    query: message.query,
                    name: message.name,
                    variables: message.variables
                }
            });
        } else if (this.state === 'started') {
            this.writeToSocket({
                type: 'start',
                'id': id,
                'payload': {
                    query: message.query,
                    name: message.name,
                    variables: message.variables
                }
            });
        } else if (this.state === 'completed') {
            // Silently ignore if connection is completed
        } else {
            throw new GraphqlUnknownError('Unknown state: ' + this.state);
        }
    }

    cancel(id: string) {
        if (this.state === 'waiting' || this.state === 'connecting') {
            // Remove from pending buffer if we are not connected already
            this.pending.delete(id);
        } else if (this.state === 'starting') {
            // If we connected, but not started remove from pending buffer (in case of failed start)
            // and send cancellation message to socket
            this.pending.delete(id);
            this.writeToSocket({
                type: 'stop',
                'id': id
            });
        } else if (this.state === 'started') {
            this.writeToSocket({
                type: 'stop',
                'id': id
            });
        } else if (this.state === 'completed') {
            // Silently ignore if connection is completed
        } else {
            throw new GraphqlUnknownError('Unknown state: ' + this.state);
        }
    }

    connect() {
        if (this.isStarted) {
            return;
        }
        this.isStarted = true;
        this.doConnect();
    }

    close() {
        if (this.isStopped) {
            return;
        }
        if (!this.isStarted) {
            throw new GraphqlUnknownError('Socket was not started');
        }
        this.isStopped = true;
        this.pending.clear();
    }

    private onMessage(src: any) {
        if (this.opts.logging) {
            console.log('[WS] <<< ' + JSON.stringify(src));
        }
        if (src.type === 'ka') {
            // Ignore
        } else if (src.type === 'connection_ack') {
            if (this.state === 'starting') {
                // Change State
                this.state = 'started';

                // Remove all pending messages
                this.pending.clear();

                if (this.opts.logging) {
                    console.log('[WS] Started');
                }

                // Send Ping
                if (this.pingTimeout) {
                    clearTimeout(this.pingTimeout);
                }
                this.pingTimeout = setTimeout(() => {
                    if (this.opts.protocol === 'openland') {
                        this.writeToSocket({
                            type: 'ping'
                        });
                    }
                }, PING_INTERVAL);

                // TODO: Reset backoff
                if (this.onConnected) {
                    this.onConnected();
                }
            }
        } else if (src.type === 'ping') {
            if (this.opts.protocol === 'openland') {
                this.writeToSocket({
                    type: 'pong'
                });
            }
        } else if (src.type === 'pong') {
            if (this.pingTimeout) {
                clearTimeout(this.pingTimeout);
                this.pingTimeout = null;
            }
            this.pingTimeout = setTimeout(() => {
                if (this.state === 'started') {
                    if (this.opts.protocol === 'openland') {
                        this.writeToSocket({
                            type: 'ping'
                        });
                    }
                }
            }, PING_INTERVAL);
        } else if (src.type === 'data') {
            let id = src.id as string;
            let payload = src.payload as any;
            let errors = payload.errors as any;
            if (errors) {
                if (this.onReceiveError) {
                    this.onReceiveError(id, errors);
                }
            } else {
                let data = payload.data;
                if (this.onReceiveData) {
                    this.onReceiveData(id, data);
                }
            }
        } else if (src.type === 'error') {
            // Critical error
            console.warn(src);
        } else if (src.type === 'connection_error') {
            if (src.payload && typeof src.payload.message === 'string') {
                if (this.opts.onConnectionFailed) {
                    this.opts.onConnectionFailed(src.payload.message);
                }
            }
        }
    }

    private doConnect() {
        if (this.state !== 'waiting') {
            throw Error('Unexpected state');
        }

        this.state = 'connecting';
        if (this.opts.logging) {
            console.log('[WS] Connecting');
        }
        let protocol = this.opts.protocol || 'apollo';
        let ws = new ThrustedSocket({
            url: this.opts.endpoint,
            timeout: protocol === 'openland' ? OPENLAND_SOCKET_TIMEOUT : APOLLO_SOCKET_TIMEOUT,
            protocol: protocol === 'apollo' ? 'graphql-ws' : undefined,
            engine: this.opts.ws
        });
        ws.onopen = () => {
            if (this.client !== ws) {
                return;
            }
            if (this.state !== 'connecting') {
                throw Error('Unexpected state');
            }
            this.state = 'starting';
            if (this.opts.logging) {
                console.log('[WS] Starting');
            }

            if (protocol === 'apollo') {
                this.writeToSocket({
                    type: 'connection_init',
                    'payload': this.opts.connectionParams || {}
                });
            } else {
                this.writeToSocket({
                    protocol_v: 2,
                    type: 'connection_init',
                    'payload': this.opts.connectionParams || {}
                });
            }

            for (let p of this.pending) {
                this.writeToSocket({
                    type: 'start',
                    id: p[0],
                    payload: p[1]
                });
            }
        };
        ws.onclose = () => {
            if (this.client !== ws) {
                return;
            }

            let sessionLost = this.state === 'started';
            // TODO: Backoff
            this.stopClient();
            this.state = 'waiting';
            if (this.opts.logging) {
                console.log('[WS] Waiting');
            }

            if (sessionLost) {
                if (this.opts.logging) {
                    console.log('[WS] Session Lost');
                }

                if (this.onDisconnected) {
                    this.onDisconnected();
                }
                if (this.onSessionLost) {
                    this.onSessionLost();
                }
            }

            this.doConnect();
        };
        ws.onmessage = (m) => {
            if (this.client !== ws) {
                return;
            }
            this.onMessage(JSON.parse(m));
        };
        this.client = ws;
    }

    private stopClient() {
        let c = this.client!;
        this.client = null;
        c.onclose = null;
        c.onopen = null;
        c.onmessage = null;
        c.close();

        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
        }
    }

    private writeToSocket(src: any) {
        // console.log('[WS] >>> ' + JSON.stringify(src));
        this.client!.send(JSON.stringify(src));
    }
}
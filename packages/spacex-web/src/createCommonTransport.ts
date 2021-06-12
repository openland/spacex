import { WebSocketProvider } from './ws/WebSocketProvider';
import { ThrustedWebSocketProvider } from './ws/ThrustedWebSocketProvider';
import { CommonTransportLayer } from './transport/CommonTransportLayer';
import { TransportLayer } from './transport/TransportLayer';
import { DefaultWebSocketProvider } from './ws/DefaultWebSocketProvider';
import { WatchDogProvider } from './ws/WatchDogProvider';

export function createCommonTransport(opts: {
    url: string,
    mode: 'transport-ws' | 'openland',
    connectionParams?: any,
    logging?: boolean,

    thruster?: boolean,
    thrusterBuckets?: number[],

    watchDogTimeout?: number,
    connectionTimeout?: number
}): TransportLayer {

    // Base WS transport
    let wsLayer: WebSocketProvider<{ url: string, protocol?: string }> = new DefaultWebSocketProvider({ logging: opts.logging, connectionTimeout: opts.connectionTimeout || 15000 });

    // WatchDog
    let watchDogTimeout = 15000;
    if (opts.mode === 'openland') {
        watchDogTimeout = 5000;
    }
    watchDogTimeout = opts.watchDogTimeout || watchDogTimeout;
    wsLayer = new WatchDogProvider(wsLayer, { timeout: watchDogTimeout, logging: opts.logging });

    // Thruster
    if (opts.thruster) {
        const buckets: number[] = opts.thrusterBuckets || [3000, 10000];
        wsLayer = new ThrustedWebSocketProvider(wsLayer, { buckets });
    }

    // Transport
    let pingInterval: number | undefined;
    if (opts.mode === 'openland') {
        pingInterval = 1000;
    }
    return new CommonTransportLayer({
        provider: wsLayer,
        endpoint: { url: opts.url, protocol: opts.mode !== 'openland' ? 'graphql-ws' : undefined },
        mode: opts.mode,
        pingInterval,
        connectionParams: opts.connectionParams,
        logging: opts.logging
    });
}
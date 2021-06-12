export interface WebSocketProvider<T> {
    create(endpoint: T, opts: WebSocketConnectionOpts): WebSocketConnection;
}

export type WebSocketConnectionOpts = {
    connectionTimeout: number;
};

export interface WebSocketConnection {
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((message: string) => void) | null;
    send(message: string): void;
    close(): void;
}
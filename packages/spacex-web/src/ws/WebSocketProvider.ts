export interface WebSocketProvider<T> {
    create(endpoint: T): WebSocketConnection;
}

export interface WebSocketConnection {
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((message: string) => void) | null;
    send(message: string): void;
    close(): void;
}
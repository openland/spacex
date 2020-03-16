export interface TransportLayer {
    onConnected: (() => void) | null;
    onDisconnected: (() => void) | null;

    onReceiveData: ((id: string, message: any) => void) | null;
    onReceiveError: ((id: string, error: any[]) => void) | null;
    onReceiveCompleted: ((id: string) => void) | null;

    onSessionLost: (() => void) | null;

    request(id: string, message: { name: string, query: string, variables: any }): void;
    cancel(id: string): void;

    connect(): void;
    close(): void;
}
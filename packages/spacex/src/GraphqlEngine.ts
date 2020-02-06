//
// Subscription
//

export interface GraphqlActiveSubscription<TSubs, TVars> {
    get(): Promise<TSubs>;
    updateVariables(src?: TVars): void;
    destroy(): void;
}

//
// Query Watch
//

export type GraphqlQueryResult<Q> = { data?: Q, error?: Error };

export interface GraphqlQueryWatch<TQuery> {
    subscribe(handler: (args: GraphqlQueryResult<TQuery>) => void): () => void;
    currentResult(): GraphqlQueryResult<TQuery> | undefined;
    result(): Promise<void>;
    destroy(): void;
}

//
// Parameters
//

export interface OperationParameters {
    fetchPolicy?: 'cache-first' | 'network-only' | 'cache-and-network' | 'no-cache';
}

export interface QueryWatchParameters {
    fetchPolicy?: 'cache-first' | 'network-only' | 'cache-and-network';
}

//
// Status
//

export interface GraphqlEngineStatus {
    status: 'connecting' | 'connected';
}

/**
 * GraphQLEngine is a low level implementation of GraphQL client
 */
export interface GraphqlEngine {
    
    /**
     * GraphQLEngine status
     */
    status: GraphqlEngineStatus;
    /**
     * Subscribing for status updates
     * @param handler handler to receive updates
     */
    watchStatus(handler: (status: GraphqlEngineStatus) => void): () => void;

    query<TQuery, TVars>(query: string, vars?: TVars, params?: OperationParameters): Promise<TQuery>;
    queryWatch<TQuery, TVars>(query: string, vars?: TVars, params?: OperationParameters): GraphqlQueryWatch<TQuery>;
    mutate<TMutation, TVars>(mutation: string, vars?: TVars): Promise<TMutation>;
    subscribe<TSubscription, TVars>(subscription: string, vars?: TVars): GraphqlActiveSubscription<TSubscription, TVars>;

    updateQuery<TQuery, TVars>(updater: (data: TQuery) => TQuery | null, query: string, vars?: TVars): Promise<boolean>;
    readQuery<TQuery, TVars>(query: string, vars?: TVars): Promise<TQuery | null>;
    writeQuery<TQuery, TVars>(data: TQuery, query: string, vars?: TVars): Promise<void>;

    /* Close GraphQL Engine */
    close(): void;
}
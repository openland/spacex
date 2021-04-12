import { QueryParameters, QueryWatchParameters, SubscriptionParameters, MutationParameters } from './../GraphqlEngine';
export interface WorkerInterface {
    setHandler(handler: ((data: any) => void)): void;
    post(data: any): void;
}

export type WorkerRequestType = 'init' | 'query' | 'watch' | 'refetch' | 'mutate';

export type WorkerRequest = {
    id: string;
} & (
        { type: 'query', query: string, variables: any, params?: QueryParameters } |
        { type: 'mutate', mutation: string, variables: any, params?: MutationParameters } |

        { type: 'watch', query: string, variables: any, params?: QueryWatchParameters } |
        { type: 'watch-destroy' } |

        { type: 'subscribe', subscription: string, variables: any, params?: SubscriptionParameters } |
        { type: 'subscribe-destroy' } |

        { type: 'read', query: string, variables: any } |
        { type: 'write', query: string, variables: any, data: any } |

        { type: 'fragment-read', fragment: string, key: string } |
        { type: 'fragment-write', fragment: string, key: string, data: any }
    );

export type WorkerResponseType = 'result' | 'error';

export type WorkerResponse = {
    id: string;
} & (
        { type: 'result', data: any } |
        { type: 'error', data: any } |
        { type: 'status', status: string }
    );
import { QueryCacheContext, QueryCache } from './QueryCache';
import {
    QueryWatchParameters,
    GraphqlEngine,
    GraphqlQueryWatch,
    QueryParameters,
    GraphqlSubscriptionHandler,
    GraphqlActiveSubscription,
    GraphqlQueryResult,
    MutationParameters,
    SubscriptionParameters
} from './GraphqlEngine';
import * as React from 'react';
import { keyFromObject } from './utils/keyFromObject';
import { PriorityContext } from './PriorityContext';

export type SpaceQueryWatchParameters = QueryWatchParameters & { suspense?: boolean };

export interface SpaceXClientParameters {
    engine: GraphqlEngine;
    defaultPriority?: PriorityContext | number | null;
    globalCache?: QueryCache | null;
}

export class BaseSpaceXClient {
    readonly engine: GraphqlEngine;
    readonly defaultPriority: PriorityContext | number | null;
    readonly globalCache: QueryCache;

    constructor(params: SpaceXClientParameters) {
        this.engine = params.engine;
        if (params.globalCache) {
            this.globalCache = params.globalCache;
        } else {
            this.globalCache = new QueryCache();
        }
        if (params && params.defaultPriority) {
            this.defaultPriority = params.defaultPriority;
        } else {
            this.defaultPriority = null;
        }
        Object.freeze(this);
    }

    close = () => {
        this.engine.close();
    }

    protected query<TQuery, TVars>(query: string, vars: TVars, opts?: QueryParameters): Promise<TQuery> {
        return this.engine.query<TQuery, TVars>(query, vars, opts);
    }

    protected refetch<TQuery, TVars>(query: string, vars?: TVars, opts?: QueryParameters): Promise<TQuery> {
        return this.engine.query<TQuery, TVars>(query, vars, { fetchPolicy: 'network-only', ...opts });
    }

    protected updateQuery<TQuery, TVars>(updater: (data: TQuery) => TQuery | null, query: string, vars?: TVars): Promise<boolean> {
        return this.engine.updateQuery<TQuery, TVars>(updater, query, vars);
    }

    protected mutate<TQuery, TVars>(mutation: string, vars?: TVars, params?: MutationParameters): Promise<TQuery> {
        return this.engine.mutate<TQuery, TVars>(mutation, vars, params);
    }

    protected subscribe<TSubscription, TVars>(handler: GraphqlSubscriptionHandler<TSubscription>, subscription: string, vars?: TVars, params?: SubscriptionParameters): GraphqlActiveSubscription<TSubscription> {
        return this.engine.subscribe<TSubscription, TVars>(handler, subscription, vars, params);
    }

    protected useQuery<TQuery, TVars>(query: string, vars: TVars, opts: SpaceQueryWatchParameters & { suspense: false }): TQuery | null;
    protected useQuery<TQuery, TVars>(query: string, vars: TVars, opts?: SpaceQueryWatchParameters): TQuery;
    protected useQuery<TQuery, TVars>(query: string, vars: TVars, opts?: SpaceQueryWatchParameters): TQuery | null {
        if (opts && opts.suspense === false) {
            return this.useQueryNonSuspense(query, vars, opts);
        } else {
            return this.useQuerySuspense(query, vars, opts);
        }
    }

    private useQueryNonSuspense<TQuery, TVars>(query: string, vars?: TVars, opts?: QueryWatchParameters): TQuery | null {
        // tslint:disable-next-line
        const [observableQuery, currentResult] = this.useObservableQuery<TQuery, TVars>(query, vars, opts);

        if (currentResult && currentResult.error) {
            throw currentResult.error!!;
        } else if (currentResult && currentResult.data) {
            return currentResult.data!!;
        } else {
            return null;
        }
    }

    private useQuerySuspense<TQuery, TVars>(query: string, vars?: TVars, opts?: QueryWatchParameters): TQuery {
        const [observableQuery, currentResult] = this.useObservableQuery<TQuery, TVars>(query, vars, opts);
        if (currentResult && currentResult.error) {
            throw currentResult.error!!;
        } else if (currentResult && currentResult.data) {
            return currentResult.data!!;
        } else {
            throw observableQuery.result();
        }
    }

    private useObservableQuery<TQuery, TVars>(query: string, vars?: TVars, opts?: QueryWatchParameters): [GraphqlQueryWatch<TQuery>, GraphqlQueryResult<TQuery> | undefined] {
        const clientCache = React.useContext(QueryCacheContext);

        if (!clientCache && (opts && opts.fetchPolicy && (opts.fetchPolicy === 'cache-and-network' || opts.fetchPolicy === 'network-only'))) {
            throw Error('Unable to use cache-and-network or network-only fetch policy outside of cache context');
        }
        const observableQuery = this.getQueryWatch<TQuery, TVars>((clientCache ? clientCache : this.globalCache).queries, query, vars, opts);

        // Value Holder
        const [responseId, setResponseId] = React.useState(0);
        const currentResult = React.useMemo(() => {
            return observableQuery.currentResult();
        }, [responseId, observableQuery]);

        // Subscription
        React.useEffect(() => {
            return observableQuery.subscribe((args) => {
                setResponseId(x => x + 1);
            });
        }, [observableQuery]);

        return [observableQuery, currentResult];
    }

    private getQueryWatch<TQuery, TVars>(cache: Map<String, GraphqlQueryWatch<{}>>, query: string, vars?: TVars, opts?: QueryWatchParameters): GraphqlQueryWatch<TQuery> {
        let defaultPriority: number | PriorityContext | undefined = undefined;
        if (this.defaultPriority !== null) {
            defaultPriority = this.defaultPriority;
        }
        let shouldBeScoped = opts && opts.fetchPolicy && (opts.fetchPolicy === 'cache-and-network' || opts.fetchPolicy === 'network-only');
        let cacheKey = (opts && opts.fetchPolicy && opts.fetchPolicy) || 'cache-first';
        let q = cache;
        if (!shouldBeScoped) {
            q = this.globalCache.queries;
        }
        let key = query + '$' + keyFromObject(vars) + '$' + cacheKey;
        if (q.has(key)) {
            // SpaceX QueryWatch fetches new data itself (see usage of doRequest on SpaceXWebClient.ts, line 167)
            // so there is no need to refetch data manually here
            return q.get(key)!! as GraphqlQueryWatch<TQuery>;
        } else {
            let res = this.engine.queryWatch<TQuery, TVars>(query, vars, { priority: defaultPriority, ...opts });
            q.set(key, res);
            return res;
        }
    }
}
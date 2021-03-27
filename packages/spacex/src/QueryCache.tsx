import * as React from 'react';
import { randomKey } from './utils/randomKey';
import { GraphqlQueryWatch } from './GraphqlEngine';

export interface QueryCacheItem {
    destroy(): void;
}

export class QueryCache {
    readonly key: string = randomKey();
    cache = new Map<String, QueryCacheItem>();

    cleanup = () => {
        for (let k of this.cache.keys()) {
            this.cache.get(k)!.destroy();
        }
        this.cache.clear();
    }
}

export const QueryCacheContext = React.createContext<QueryCache | undefined>(undefined);

export const QueryCacheProvider = (props: { children: any }) => {
    const cache = React.useMemo(() => new QueryCache(), []);
    React.useEffect(() => { return () => cache.cleanup(); }, []);

    return (
        <QueryCacheContext.Provider value={cache}>
            {props.children}
        </QueryCacheContext.Provider>
    );
};
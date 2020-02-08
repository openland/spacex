import * as React from 'react';
import { randomKey } from './utils/randomKey';
import { GraphqlQueryWatch } from './GraphqlEngine';

export class QueryCache {
    readonly key: string = randomKey();
    queries = new Map<String, GraphqlQueryWatch<{}>>();

    cleanup = () => {
        for (let k of this.queries.keys()) {
            this.queries.get(k)!.destroy();
        }
        this.queries.clear();
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
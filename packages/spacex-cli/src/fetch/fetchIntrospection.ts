import fetch from 'node-fetch';
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';

export async function fetchIntrospection(endpoint: string, type: 'json' | 'graphql') {

    // Get Query
    const introspectionQuery = getIntrospectionQuery();

    // Fetch Schema
    const { data, errors } = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: introspectionQuery }),
    }).then(res => res.json());
    if (errors) {
        throw Error(JSON.stringify(errors, null, 2));
    }

    // Return JSON format
    if (type === 'json') {
        return JSON.stringify(data, null, 2);
    }

    // Return in graphql format
    const schema = buildClientSchema(data);
    return printSchema(schema);
}
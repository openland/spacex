# SpaceX GraphQL

[![Version npm](https://img.shields.io/npm/v/@openland/spacex.svg?logo=npm)](https://www.npmjs.com/package/@openland/spacex)

Scalable and typesafe GraphQL client for JS, React and React Native.

## Features

- 🦺Simple codegeneration with full type safety at runtime and in typescript
- 🚀~50% reduction in RAM usage and up to x20 performance in persistence (comparing to Apollo)
- 🏎Does not block main thread
- 🍰Layered design that allows replace transport, socket or graphql core implementations

## Install

```bash
yarn add @openland/spacex @openland/spacex-web
yarn add -D @openland/spacex-cli get-graphql-schema
```

## Generate Client

### Requirements

- API Endpoint too download schema from (ex: https://api.example.com/graphql)
- .graphql files with operations (ex: ./src/api/definitions/\*.graphql)

### Generate Client

SpaceX Compiler generates three files: 
* `spacex.definitions.json`: Descriptors of all fragments and operations for GraphQL Engines
* `spacex.types.ts`: Typescript fragments and operations files
* `spacex.ts`: Client itself

```bash
get-graphql-schema https://api.example.com/graphql --json > schema.json
yarn spacex-cli compile \
    --path "./src/api/definitions/*.graphql" \
    --schema ./schema.json \
    --output ./src/api/ \
    --name ExampleClient
```

### Create Client

```js
import { WebEngine, createCommonTransport } from '@openland/spacex-web'
import { ExampleClient } from './spacex'

// Transport
const transport = createCommonTransport({
  url: 'wss://swan.korshakov.com/graphql',
  mode: 'transport-ws',
  connectionParams: {
    token: 'some-fancy-token'
  }
})

// Engine
const engine = new WebEngine({
  definitions: require('./spacex.descriptor.json'),
  transport
})

// Client
const client = new ExampleClient(engine)
```

### Using client

#### Queries

For each query in definitions there are generated functions on client:

```js
// Simple Promise-based api
const me = await client.queryUser({ username: 'steve' }); // returns: Promise<User>

// Provide fetchPolicy - bypass cache and fetch from network
const me = await client.queryUser({ username: 'steve' }, { fetchPolicy: 'network-only' });

// Refetch method - sugar for fetchPolicy: 'network-only'
const me = await client.refetchUser({ username: 'steve' });

// Hook with suspence
const me = client.useUser({ username: 'steve' }); // returns: User

// Hook with fetchPolicy
const me = client.useUser({ username: 'steve' }, { fetchPolicy: 'network-only' }); // returns: User

// Hook without suspence
const me = client.useUser({ username: 'steve' }, { suspence: false }); // returns: User | null
```

#### Mutations

For each defined mutation there this generated function:
```js
// Simple Promise-based api
const result = await client.mutateSendMessage({ chat: 'steve', message: 'Hello, SpaceX!' });
```

#### Subscriptions

For each defined mutation there this generated function:
```js

// Subscription
const subscription = client.subscribeNewMessages({ chat: 'steve', from: Date.now() }, handler: (e) => {
    if (e.type === 'stopped') {
        // Subscription stopped
        // No more updates in this handler
    } else if (e.type === 'message') {
        // Received message
        const message = e.message;
    }
});

// Destroy subscription
subscription.destroy();
```

# License
MIT

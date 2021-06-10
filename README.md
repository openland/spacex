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

- `spacex.definitions.json`: Descriptors of all fragments and operations for GraphQL Engines
- `spacex.types.ts`: Typescript fragments and operations files
- `spacex.ts`: Client itself

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
  url: 'wss://api.example.com/graphql',
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
const me = await client.queryUser({ username: 'steve' }) // returns: Promise<User>

// Provide fetchPolicy - bypass cache and fetch from network
const me = await client.queryUser(
  { username: 'steve' },
  { fetchPolicy: 'network-only' }
)

// Refetch method - sugar for fetchPolicy: 'network-only'
const me = await client.refetchUser({ username: 'steve' })

// Hook with suspence
const me = client.useUser({ username: 'steve' }) // returns: User

// Hook with fetchPolicy
const me = client.useUser(
  { username: 'steve' },
  { fetchPolicy: 'network-only' }
) // returns: User

// Hook without suspence
const me = client.useUser({ username: 'steve' }, { suspence: false }) // returns: User | null
```

#### Mutations

For each defined mutation there this generated function:

```js
// Simple Promise-based api
const result = await client.mutateSendMessage({
  chat: 'steve',
  message: 'Hello, SpaceX!'
})
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

#### Reading and Writing to Store

If you want to edit store you are able to update queries in the store via `update*` functions:

```js
await client.updateUser({username: 'stever'}, updated: (src) => {
    return {
        ...src,
        friends: src.friends + 1
    };
});
```

## Web Worker

Since there are multiple ways to deploy web workers `SpaceX` provides API for integration and leaves developer a freedom to deploy any way they wish.

### Create Web Worker host

This is a code to run web worker host - the code that executes queries itself and answers for requests from main process.

```js
import {
  WebEngine,
  createCommonTransport,
  WorkerInterface,
  WorkerHost
} from '@openland/spacex-web'
var host

//
// Handler for first message: It fetches connectionParams and creates an engine
//
const initHandler = (ev: MessageEvent) => {
  // Read init package
  let msg = ev.data
  if (msg.type !== 'init') {
    throw Error('Worker need to be inited first!')
  }
  self.removeEventListener('message', initHandler)

  // Define Worker Interface
  let workerInterface: WorkerInterface = {
    post: src => self.postMessage(src),
    setHandler: handler =>
      self.addEventListener('message', (src: any) => handler(src.data))
  }

  // Create transport
  const transport = createCommonTransport({
    url: 'wss://api.example.com/graphql',
    mode: 'transport-ws',
    connectionParams: {
      token: msg.token
    }
  })

  // Create Engine
  const engine = new WebEngine({
    definitions: require('./spacex.descriptor.json'),
    transport
  })

  // Create Host
  host = new WorkerHost({
    engine,
    worker: workerInterface
  })
}

self.addEventListener('message', initHandler)
```

### Create Web Worker Engine

```js

// Our connection token
const token: string = 'some-fancy-worker'

// Create WebWorker
const W = require('./spacex.worker') // NOTE: We using WebPack plugin to generate web workers
let thread: Worker = new W()
thread.onerror = e => {
  console.error(e) // There are no way to recover easily
}

// Send init package to worker
thread.postMessage({ type: 'init', token })

// Create Engine
let threadInterface: WorkerInterface = {
  post: src => thread.postMessage(src),
  setHandler: handler =>
    (thread.onmessage = src => {
      handler(src.data)
    })
}
const engine = new WorkerEngine({ worker: threadInterface });

// Client
const client = new ExampleClient(engine)
```

# License

MIT

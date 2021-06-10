# SpaceX GraphQL

[![Version npm](https://img.shields.io/npm/v/srp6a.svg?logo=npm)](https://www.npmjs.com/package/srp6a)

Modular and easy to use implementation of GraphQL that built for React and React Native.

## Features
* 🦺Simple codegeneration with full type safety at runtime and in typescript
* 🚀~50% reduction in RAM usage and up to x20 performance in persistence (comparing to Apollo)
* 🏎Does not block main thread
* 🍰Layered design that allows replace transport, socket or graphql core implementations

## Install

```
yarn add @openland/spacex @openland/spacex-web
yarn add -D @openland/spacex-cli get-graphql-schema
```

## Generate Client

### Requirements
* API Endpoint too download schema from (ex: https://api.example.com/graphql)
* .graphql files with operations (ex: ./src/api/definitions/*.graphql)


### Generate Client
```
get-graphql-schema https://api.example.com/graphql --json > schema.json
yarn spacex-cli compile \
    --path "./src/api/definitions/*.graphql" \
    --schema ./schema.json \
    --output ./src/api/ \
    --name ExampleClient
```

### Create Client

```
import { WebEngine, createCommonTransport } from '@openland/spacex-web';
import { ExampleClient } from './spacex';

// Transport
const transport = createCommonTransport({
    url: 'wss://swan.korshakov.com/graphql',
    mode: 'transport-ws',
    connectionParams: {
        token: 'some-fancy-token',
    }
});

// Engine
const engine = new WebEngine({
    definitions: require('./spacex.descriptor.json'),
    transport
});

// Client
const client = new ExampleClient(engine);

```

### Using client

TODO

# License
MIT
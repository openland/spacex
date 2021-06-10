# Web Engine for SpaceX GraphQL

Web Engine for SpaceX GraphQL.

## Install

```bash
yarn add @openland/spacex @openland/spacex-web
```

### Web Engine

```js
import { WebEngine, createCommonTransport } from '@openland/spacex-web'

// Transport
const transport = createCommonTransport({
  url: 'wss://api.example.com/graphql',
  mode: 'transport-ws',
  connectionParams: {
    token: 'some-fancy-token'
  }
});

// Engine
const engine = new WebEngine({
  definitions: require('./spacex.descriptor.json'),
  transport
});
```

## Web Worker Engine

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
```

# License

MIT

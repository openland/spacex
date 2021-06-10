# SpaceX GraphQL Compiler

Compiler for SpaceX GraphQL.

## Install

```bash
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

# License

MIT

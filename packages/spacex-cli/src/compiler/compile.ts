import fs from 'fs';
import glob from 'glob';
import { buildClientSchema, parse, GraphQLSchema, FragmentDefinitionNode, OperationDefinitionNode, SelectionSetNode, DocumentNode } from 'graphql';
import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer';
import { withTypenameFieldAddedWhereNeeded } from './utils/withTypenameFieldAddedWhereNeeded';
import { astToString } from './utils/astToString';
import { compileDescriptor } from './compileDescriptor';
import { compileTypes } from './compileTypes';
import { compileClient } from './compileClient';
import ora from 'ora';

export type CompileContext = {
    schema: GraphQLSchema,
    documents: DocumentNode[],
    queries: Map<string, { definition: OperationDefinitionNode, source: string, usesFragments: Set<string> }>,
    mutations: Map<string, { definition: OperationDefinitionNode, source: string, usesFragments: Set<string> }>,
    subscriptions: Map<string, { definition: OperationDefinitionNode, source: string, usesFragments: Set<string> }>,
    fragments: Map<string, { definition: FragmentDefinitionNode, source: string, usesFragments: Set<string>, usedBy: Set<string> }>
}

export async function compile(path: string, schemaPath: string, output: string, name: string) {
    const loading = ora();
    loading.start('Loading schema');

    // Load schema
    const schema = buildClientSchema(JSON.parse(fs.readFileSync(schemaPath, 'utf-8')));

    // Load queries
    const files = glob.sync(path).map((f) => fs.readFileSync(f, 'utf-8'));
    const documents = files.map((f) => parse(f));

    // Optimizing
    loading.start('Optimizing queries');

    // Add __typename
    const withTypenames = documents.map((d) => withTypenameFieldAddedWhereNeeded(d));

    // Optimize via relay compiler
    const optimized = optimizeDocuments(schema, withTypenames.map((v) => v), { includeFragments: true });

    // Resolve model
    const queries = new Map<string, { definition: OperationDefinitionNode, source: string, usesFragments: Set<string> }>();
    const mutations = new Map<string, { definition: OperationDefinitionNode, source: string, usesFragments: Set<string> }>();
    const subscriptions = new Map<string, { definition: OperationDefinitionNode, source: string, usesFragments: Set<string> }>();
    const fragments = new Map<string, { definition: FragmentDefinitionNode, source: string, usesFragments: Set<string>, usedBy: Set<string> }>();

    // Collect definitions
    for (let i = 0; i < optimized.length; i++) {
        const document = optimized[i];
        for (let def of document.definitions) {
            const source = astToString(def);
            if (def.kind === 'OperationDefinition') {
                if (!def.name) {
                    throw Error('Operations without names are not supported');
                }
                if (def.operation === 'query') {
                    queries.set(def.name.value, { definition: def, source, usesFragments: new Set() });
                } else if (def.operation === 'mutation') {
                    mutations.set(def.name.value, { definition: def, source, usesFragments: new Set() });
                } else if (def.operation === 'subscription') {
                    subscriptions.set(def.name.value, { definition: def, source, usesFragments: new Set() });
                } else {
                    throw Error('Unsupported operation type: ' + def.operation);
                }
            } else if (def.kind === 'FragmentDefinition') {
                if (!def.name) {
                    throw Error('Operations without names are not supported');
                }
                fragments.set(def.name.value, { definition: def, source, usesFragments: new Set(), usedBy: new Set() });
            } else {
                throw Error('Unsupported definition: ' + def.kind);
            }
        }
    }

    function _collectDependencies(selectionSet: SelectionSetNode, output: Set<string>) {
        for (let s of selectionSet.selections) {
            if (s.kind === 'FragmentSpread') {
                if (output.has(s.name.value)) {
                    continue;
                }
                _collectDependencies(fragments.get(s.name.value)!.definition.selectionSet, output);
            } else if (s.kind === 'Field') {
                continue;
            } else if (s.kind === 'InlineFragment') {
                _collectDependencies(s.selectionSet, output);
            }
        }
    }
    function collectDependencies(selectionSet: SelectionSetNode) {
        const res = new Set<string>();
        _collectDependencies(selectionSet, res);
        return Array.from(res);
    }

    // Collect references
    for (const [name, fragment] of fragments.entries()) {
        const deps = collectDependencies(fragment.definition.selectionSet);
        for (let dep of deps) {
            fragment.usesFragments.add(dep);
            fragments.get(dep)!.usedBy.add(name);
        }
    }
    for (const [name, query] of queries.entries()) {
        const deps = collectDependencies(query.definition.selectionSet);
        for (let dep of deps) {
            query.usesFragments.add(dep);
            fragments.get(dep)!.usedBy.add(name);
        }
    }
    for (const [name, mutation] of mutations.entries()) {
        const deps = collectDependencies(mutation.definition.selectionSet);
        for (let dep of deps) {
            mutation.usesFragments.add(dep);
            fragments.get(dep)!.usedBy.add(name);
        }
    }
    for (const [name, subscription] of subscriptions.entries()) {
        const deps = collectDependencies(subscription.definition.selectionSet);
        for (let dep of deps) {
            subscription.usesFragments.add(dep);
            fragments.get(dep)!.usedBy.add(name);
        }
    }

    // Context
    const context: CompileContext = {
        queries, mutations, subscriptions, fragments, schema, documents
    };

    // Compile execution descriptor
    loading.start('Generating descriptor');
    const descriptor = compileDescriptor(context);
    fs.writeFileSync(output + '/spacex.descriptor.json', descriptor, 'utf-8');

    // Compile types
    loading.start('Generating types');
    await compileTypes(output + '/spacex.types.ts', context);

    // Compile client
    loading.start('Generating client');
    const client = compileClient(name, context);
    fs.writeFileSync(output + '/spacex.ts', client, 'utf-8');

    loading.succeed('Completed');
}
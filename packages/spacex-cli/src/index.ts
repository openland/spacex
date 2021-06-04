#!/usr/bin/env node
const version = require(__dirname + '/../package.json').version as string;
import program from 'commander';
import { compile } from './compiler/compile';

// Description
program
    .name('spacex-cli')
    .version(version)
    .description('SpaceX GraphQL CLI');

// Compiler
program.command('compile')
    .description('Compile GraphQL queries')
    .option('-p, --path [recover]', 'GraphQL path queries')
    .option('-s, --schema [schema]', 'GraphQL JSON schema')
    .option('-o, --output <output>', 'GraphQL output directory')
    .option('-n, --name <name>', 'Optional client name')
    .option('--optimize-inline', 'Inline all fragments. Default: false.', false)
    .option('--optimize-flatten', 'Flatten queries. Default: true', true)
    .action(async (options) => {
        const resolved = options.path as string;
        const schema = options.schema as string;
        const output = options.output as string || '.';
        const name = options.name || 'SpaceXClient';
        const optimizeInline = options.optimizeInline as boolean;
        const optimizeFlatten = options.optimizeInline as boolean;

        await compile({
            path: resolved,
            schemaPath: schema,
            output,
            name,
            enableFlattenTransform: optimizeFlatten,
            enableInlineFragment: optimizeInline,
            enableSkipRedundant: true
        });
    });

// Start
program.parse(process.argv);
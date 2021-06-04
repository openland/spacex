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
    .action(async (options) => {
        const resolved = options.path as string;
        const schema = options.schema as string;
        const output = options.output as string || '.';
        const name = options.name || 'SpaceXClient';
        await compile(resolved, schema, output, name);
    });

// Start
program.parse(process.argv);
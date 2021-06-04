import { DocumentNode, DefinitionNode, GraphQLSchema, concatAST, parse } from "graphql";
import { printSchemaWithDirectives, SchemaPrintOptions } from '@graphql-tools/utils';

import { transform as skipRedundantNodesTransform } from 'relay-compiler/lib/transforms/SkipRedundantNodesTransform';
import { transform as inlineFragmentsTransform } from 'relay-compiler/lib/transforms/InlineFragmentsTransform';
// import { transform as applyFragmentArgumentTransform } from 'relay-compiler/lib/transforms/ApplyFragmentArgumentTransform';
import { transformWithOptions as flattenTransformWithOptions } from 'relay-compiler/lib/transforms/FlattenTransform';

import CompilerContext from 'relay-compiler/lib/core/CompilerContext';
import { transform as relayTransform } from 'relay-compiler/lib/core/RelayParser';
import { print as relayPrint } from 'relay-compiler/lib/core/IRPrinter';
import { create as relayCreate } from 'relay-compiler/lib/core/Schema';

export function optimize(
    schema: GraphQLSchema,
    documents: DocumentNode[],
    opts: {
        enableFlattenTransform?: boolean,
        enableSkipRedundant?: boolean,
        enableInlineFragment?: boolean,
    }) {

    // Some magic to prepare schema and documents for relay
    const adjustedSchema = relayCreate(printSchemaWithDirectives(schema, {}));
    const documentAsts = concatAST(documents);
    const relayDocuments = relayTransform(adjustedSchema, documentAsts.definitions as DefinitionNode[]);

    // Configure compiler
    let context = new CompilerContext(adjustedSchema);
    context = context.addAll(relayDocuments);
    const transforms: any[] = [];
    if (opts.enableInlineFragment) {
        transforms.push(inlineFragmentsTransform);
    }
    if (opts.enableFlattenTransform === true) {
        transforms.push(flattenTransformWithOptions({ flattenAbstractTypes: false }));
    }
    if (opts.enableSkipRedundant !== false) {
        transforms.push(skipRedundantNodesTransform);
    }
    context = context.applyTransforms(transforms);
    const result: DocumentNode[] = [];
    result.push(...context.documents().map(doc => parse(relayPrint(adjustedSchema, doc), { noLocation: true })));

    // Copy fragments anyway if they have been flatten
    if (opts.enableFlattenTransform) {
        let fragmentsContext = new CompilerContext(adjustedSchema);
        fragmentsContext = fragmentsContext.addAll(relayDocuments);
        const fragmentTransforms: any[] = [];
        if (opts.enableFlattenTransform === true) {
            fragmentTransforms.push(flattenTransformWithOptions({ flattenAbstractTypes: false }));
        }
        if (opts.enableSkipRedundant !== false) {
            fragmentTransforms.push(skipRedundantNodesTransform);
        }
        fragmentsContext = fragmentsContext.applyTransforms(fragmentTransforms);
        result.push(
            ...fragmentsContext
                .documents()
                .filter(doc => doc.kind === 'Fragment')
                .map(doc => parse(relayPrint(adjustedSchema, doc), { noLocation: true }))
        );
    }
    return result;
}
import { DocumentNode, DefinitionNode } from 'graphql';
import { CompileContext } from './compile';
import Apollo from 'apollo/lib/generate';

export async function compileTypes(output: string, context: CompileContext) {
    const definitions: DefinitionNode[] = [];
    for (let k of context.documents) {
        for (let d of k.definitions) {
            definitions.push(d);
        }
    }
    const document: DocumentNode = { kind: 'Document', definitions };
    Apollo(document, context.schema as any, output, undefined, 'typescript', '', false, { useFlowExactObjects: false });
}
import { SelectionSetNode, visit, ASTNode, FieldNode, Kind } from 'graphql';

const typenameField = {
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: "__typename" }
};

export function withTypenameFieldAddedWhereNeeded(ast: ASTNode) {
    return visit(ast, {
        enter: {
            SelectionSet(node: SelectionSetNode) {
                return {
                    ...node,
                    selections: node.selections.filter(
                        selection =>
                            !(
                                selection.kind === "Field" &&
                                (selection as FieldNode).name.value === "__typename"
                            )
                    )
                };
            }
        },
        leave(node: ASTNode) {
            if (!(node.kind === "Field" || node.kind === "FragmentDefinition"))
                return undefined;
            if (!node.selectionSet) return undefined;

            return {
                ...node,
                selectionSet: {
                    ...node.selectionSet,
                    selections: [typenameField, ...node.selectionSet.selections]
                }
            };
        }
    });
}
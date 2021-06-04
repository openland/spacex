import {
    GraphQLEnumType, SelectionSetNode, SelectionNode, GraphQLOutputType, GraphQLNonNull, GraphQLScalarType,
    ValueNode, GraphQLUnionType, GraphQLList, GraphQLInterfaceType, isInterfaceType, isObjectType, GraphQLObjectType
} from 'graphql';
import { CompileContext } from './compile';
import {
    boolValue, field, floatValue, nullValue,
    fragment, inline, InputValue, intValue, list, listValue, notNull, obj, objectValue, OutputType, OutputTypeObject, refValue, scalar, Selector, stringValue
} from './descriptor';
import { jsonStringifyMinimized } from './utils/jsonStringifyMinimized';

export function compileDescriptor(context: CompileContext) {

    // export interface OperationDefinition {
    //     name: string;
    //     body: string;
    //     kind: 'query' | 'mutation' | 'subscription';
    //     selector: OutputTypeObject;
    // }

    // export interface FragmentDefinition {
    //     name: string;
    //     selector: OutputTypeObject;
    // }

    const result: {
        fragments: { [name: string]: { name: string, selector: OutputTypeObject } },
        operations: { [name: string]: { name: string, kind: 'query' | 'mutation' | 'subscription', body: string, selector: OutputTypeObject } }
    } = {
        fragments: {},
        operations: {}
    };

    // Collect Enums
    // for (let type of Object.values(context.schema.getTypeMap())) {
    //     if (type.name.startsWith('__')) {
    //         continue;
    //     }
    //     if (type instanceof GraphQLEnumType) {
    //         result.enums.push({ name: type.name, values: type.getValues().map((v) => v.name) });
    //     }
    // }

    function generateInputValue(value: ValueNode): InputValue {
        if (value.kind === 'IntValue') {
            return intValue(parseInt(value.value, 10));
        } else if (value.kind === 'BooleanValue') {
            return boolValue(value.value);
        } else if (value.kind === 'FloatValue') {
            return floatValue(parseFloat(value.value));
        } else if (value.kind === 'EnumValue') {
            return stringValue(value.value);
        } else if (value.kind === 'Variable') {
            return refValue(value.name.value);
        } else if (value.kind === 'StringValue') {
            return stringValue(value.value);
        } else if (value.kind === 'ListValue') {
            return listValue(...value.values.map((v) => generateInputValue(v)))
        } else if (value.kind === 'ObjectValue') {
            const args: { name: string, value: InputValue }[] = [];
            for (let f of value.fields) {
                args.push({ name: f.name.value, value: generateInputValue(f.value) });
            }
            return objectValue(...args);
        } else if (value.kind === 'NullValue') {
            return nullValue();
        }

        throw Error('Unknown type');
    }

    function generateOutputType(type: GraphQLOutputType, selectionSet?: SelectionSetNode): OutputType {
        if (type instanceof GraphQLNonNull) {
            return notNull(generateOutputType(type.ofType, selectionSet));
        }
        if (type instanceof GraphQLList) {
            return list(generateOutputType(type.ofType, selectionSet));
        }
        if (type instanceof GraphQLEnumType) {
            return scalar('String');
        }
        if (type instanceof GraphQLScalarType) {
            return scalar(type.name);
        }
        if (type instanceof GraphQLObjectType) {
            return generateSelectionSet(type.name, selectionSet!);
        }
        if (type instanceof GraphQLInterfaceType) {
            return generateSelectionSet(type.name, selectionSet!);
        }
        if (type instanceof GraphQLUnionType) {
            return generateSelectionSet(type.name, selectionSet!);
        }
        throw Error('Unknwon type');
    }

    function generateSelection(type: string, selection: SelectionNode): Selector {
        if (selection.kind === 'Field') {
            if (selection.name.value === '__typename') {
                return field('__typename', '__typename', {}, scalar('String'));
            }

            const tp = context.schema.getType(type)!;
            if (!isInterfaceType(tp) && !isObjectType(tp)) {
                throw Error('Invalid type: ' + type);
            }
            const ft = tp.getFields()[selection.name.value];
            if (!ft) {
                throw Error('Unable to find field ' + selection.name.value + ' in type ' + type);
            }
            const args: { [key: string]: InputValue } = {};
            if (selection.arguments) {
                for (let arg of selection.arguments) {
                    args[arg.name.value] = generateInputValue(arg.value);
                }
            }
            return field(selection.name.value, selection.alias ? selection.alias.value : selection.name.value, args, generateOutputType(ft.type, selection.selectionSet));
        } else if (selection.kind === 'InlineFragment') {
            return inline(selection.typeCondition!.name.value, generateSelectionSet(selection.typeCondition!.name.value, selection.selectionSet))
        } else if (selection.kind === 'FragmentSpread') {
            return fragment(selection.name.value);
        } else {
            throw Error('Unknown selector')
        }
    }
    function generateSelectionSet(type: string, selectionSet: SelectionSetNode) {
        return obj(
            ...selectionSet.selections.map((s) => generateSelection(type, s))
        );
    }

    // Generate Descriptor
    for (let [name, fragment] of context.fragments.entries()) {
        const r = generateSelectionSet(fragment.definition.typeCondition.name.value, fragment.definition.selectionSet);
        result.fragments[name] = { name, selector: r };
    }
    for (let [name, query] of context.queries.entries()) {
        const r = generateSelectionSet('Query', query.definition.selectionSet);
        result.operations[name] = { name, kind: 'query', selector: r, body: query.source };
    }
    for (let [name, mutation] of context.mutations.entries()) {
        const r = generateSelectionSet('Mutation', mutation.definition.selectionSet);
        result.operations[name] = { name, kind: 'mutation', selector: r, body: mutation.source };
    }
    for (let [name, subscription] of context.subscriptions.entries()) {
        const r = generateSelectionSet('Subscription', subscription.definition.selectionSet);
        result.operations[name] = { name, kind: 'subscription', selector: r, body: subscription.source };
    }

    // Generate JSON
    return jsonStringifyMinimized(result);
}
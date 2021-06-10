// Output Type

export type OutputTypeNotNull = {
    type: 'notNull',
    inner: OutputType
};
export type OutputTypeList = {
    type: 'list',
    inner: OutputType
};
export type OutputTypeScalar = {
    type: 'scalar',
    name: String
};
export type OutputTypeObject = {
    type: 'object',
    selectors: Selector[]
};

export type OutputType =
    | OutputTypeNotNull
    | OutputTypeList
    | OutputTypeScalar
    | OutputTypeObject;

// Input Type

export type InputValueString = {
    type: 'string',
    value: string
};
export type InputValueInt = {
    type: 'int',
    value: number
};
export type InputValueFloat = {
    type: 'float',
    value: number
};
export type InputValueBoolean = {
    type: 'boolean',
    value: boolean
};
export type InputValueNull = {
    type: 'null'
};
export type InputValueList = {
    type: 'list',
    items: InputValue[]
};
export type InputValueObject = {
    type: 'object',
    fields: { [key: string]: InputValue };
};
export type InputValueReference = {
    type: 'reference',
    name: string;
};

export type InputValue =
    | InputValueString
    | InputValueInt
    | InputValueFloat
    | InputValueBoolean
    | InputValueNull
    | InputValueList
    | InputValueObject
    | InputValueReference;

// Selector Types

export type SelectorField = {
    type: 'field',
    name: string,
    alias: string,
    fieldType: OutputType,
    arguments: { [key: string]: InputValue }
};

export type SelectorFragment = {
    type: 'fragment',
    name: string
};

export type SelectorTypeCondition = {
    type: 'type-condition',
    name: string,
    fragmentType: OutputTypeObject
};

export type Selector = SelectorField | SelectorFragment | SelectorTypeCondition;

export interface OperationDefinition {
    name: string;
    body: string;
    kind: 'query' | 'mutation' | 'subscription';
    selector: OutputTypeObject;
}

export interface FragmentDefinition {
    name: string;
    selector: OutputTypeObject;
}

export type Definitions = {
    operations: { [key: string]: OperationDefinition },
    fragments: { [key: string]: FragmentDefinition }
};
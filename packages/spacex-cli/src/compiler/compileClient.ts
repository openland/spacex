import { Output } from './utils/Output';
import { CompileContext } from "./compile";

export function compileClient(clientName: string, context: CompileContext) {
    const output = new Output();

    output.append(`/* tslint:disable */`);
    output.append(`/* eslint-disable */`);
    output.append(`import * as Types from './spacex.types';`);
    output.append(`import { SpaceXClientParameters, GraphqlActiveSubscription, QueryParameters, MutationParameters, SubscriptionParameters, GraphqlSubscriptionHandler, BaseSpaceXClient, SpaceQueryWatchParameters } from '@openland/spacex';`);
    output.append(``);
    output.append(`export class ${clientName} extends BaseSpaceXClient {`);
    output.append(`    constructor(params: SpaceXClientParameters) {`);
    output.append(`        super(params);`);
    output.append(`    }`);

    output.append(`    withParameters(params: Partial<SpaceXClientParameters>) {`);
    output.append(`        return new ${clientName}({ ... params, engine: this.engine, globalCache: this.globalCache});`);
    output.append(`    }`);

    // query*
    for (let [name, query] of context.queries.entries()) {
        if (query.definition.variableDefinitions && query.definition.variableDefinitions.length > 0) {
            output.append(`    query${name}(variables: Types.${name}Variables, params?: QueryParameters): Promise<Types.${name}> {`)
            output.append(`        return this.query('${name}', variables, params);`)
            output.append(`    }`);
        } else {
            output.append(`    query${name}(params?: QueryParameters): Promise<Types.${name}> {`)
            output.append(`        return this.query('${name}', undefined, params);`)
            output.append(`    }`);
        }
    }

    // refetch*
    for (let [name, query] of context.queries.entries()) {
        if (query.definition.variableDefinitions && query.definition.variableDefinitions.length > 0) {
            output.append(`    refetch${name}(variables: Types.${name}Variables, params?: QueryParameters): Promise<Types.${name}> {`)
            output.append(`        return this.refetch('${name}', variables, params);`)
            output.append(`    }`);
        } else {
            output.append(`    refetch${name}(params?: QueryParameters): Promise<Types.${name}> {`)
            output.append(`        return this.refetch('${name}', undefined, params);`)
            output.append(`    }`);
        }
    }

    // update*
    for (let [name, query] of context.queries.entries()) {
        if (query.definition.variableDefinitions && query.definition.variableDefinitions.length > 0) {
            output.append(`    update${name}(variables: Types.${name}Variables, updater: (data: Types.${name}) => Types.${name} | null): Promise<boolean> {`)
            output.append(`        return this.updateQuery(updater, '${name}', variables);`)
            output.append(`    }`);
        } else {
            output.append(`    update${name}(updater: (data: Types.${name}) => Types.${name} | null): Promise<boolean> {`)
            output.append(`        return this.updateQuery(updater, '${name}', undefined);`)
            output.append(`    }`);
        }
    }

    // use*
    for (let [name, query] of context.queries.entries()) {
        if (query.definition.variableDefinitions && query.definition.variableDefinitions.length > 0) {
            output.append(`    use${name}(variables: Types.${name}Variables, params: SpaceQueryWatchParameters & { suspense: false }): Types.${name} | null;`)
            output.append(`    use${name}(variables: Types.${name}Variables, params?: SpaceQueryWatchParameters): Types.${name};`);
            output.append(`    use${name}(variables: Types.${name}Variables, params?: SpaceQueryWatchParameters): Types.${name} | null {;`);
            output.append(`        return this.useQuery('${name}', variables, params);`)
            output.append(`    }`)
        } else {
            output.append(`    use${name}(params: SpaceQueryWatchParameters & { suspense: false }): Types.${name} | null;`)
            output.append(`    use${name}(params?: SpaceQueryWatchParameters): Types.${name};`);
            output.append(`    use${name}(params?: SpaceQueryWatchParameters): Types.${name} | null {;`);
            output.append(`        return this.useQuery('${name}', undefined, params);`)
            output.append(`    }`)
        }
    }

    // mutate*
    for (let [name, mutation] of context.mutations.entries()) {
        if (mutation.definition.variableDefinitions && mutation.definition.variableDefinitions.length > 0) {
            output.append(`    mutate${name}(variables: Types.${name}Variables, params?: MutationParameters): Promise<Types.${name}> {`);
            output.append(`        return this.mutate('${name}', variables, params)`);
            output.append(`    }`);
        } else {
            output.append(`    mutate${name}(params?: MutationParameters): Promise<Types.${name}> {`);
            output.append(`        return this.mutate('${name}', undefined, params)`);
            output.append(`    }`);
        }
    }

    // subscribe*
    for (let [name, subscription] of context.subscriptions.entries()) {
        if (subscription.definition.variableDefinitions && subscription.definition.variableDefinitions.length > 0) {
            output.append(`    subscribe${name}(variables: Types.${name}Variables, handler: GraphqlSubscriptionHandler<Types.${name}>, params?: SubscriptionParameters): GraphqlActiveSubscription<Types.${name}> {`);
            output.append(`        return this.subscribe(handler, '${name}', variables, params);`);
            output.append(`    }`);
        } else {
            output.append(`    subscribe${name}(handler: GraphqlSubscriptionHandler<Types.${name}>, params?: SubscriptionParameters): GraphqlActiveSubscription<Types.${name}> {`);
            output.append(`        return this.subscribe(handler, '${name}', undefined, params);`);
            output.append(`    }`);
        }
    }

    output.append(`}`);

    // output.WriteLine("import * as Types from './spacex.types';")
    // output.WriteLine("import { SpaceXClientParameters, GraphqlActiveSubscription, QueryParameters, MutationParameters, SubscriptionParameters, GraphqlSubscriptionHandler, BaseSpaceXClient, SpaceQueryWatchParameters } from '@openland/spacex';")
    // output.WriteLine("")
    // output.WriteLine("export class " + name + " extends BaseSpaceXClient {")
    // output.IndentAdd()
    // output.WriteLine("constructor(params: SpaceXClientParameters) {")
    // output.IndentAdd()
    // output.WriteLine("super(params);")
    // output.IndentRemove()
    // output.WriteLine("}")

    return output.build();
}
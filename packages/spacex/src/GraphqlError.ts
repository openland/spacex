
export class GraphqlError extends Error {
    readonly errors: any[];
    constructor(errors: any[]) {
        super('GraphQL Error');
        this.errors = errors;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, GraphqlError.prototype);
    }
}

export class GraphqlUnknownError extends Error {
    constructor(message: string) {
        super(message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, GraphqlUnknownError.prototype);
    }
}
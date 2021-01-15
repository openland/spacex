function extractError(errors: any[]): string {
    if (Array.isArray(errors)) {
        if (errors.length > 0) {
            if (typeof errors[0].message === 'string') {
                return errors[0].message;
            }
        }
    }
    return 'GraphQL Error';
}
export class GraphqlError extends Error {
    readonly errors: any[];

    constructor(errors: any[]) {
        super(extractError(errors));
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
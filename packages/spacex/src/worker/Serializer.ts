import { GraphqlError, GraphqlUnknownError } from "../GraphqlError"

export const Serializer = {
    serializeError: (src: any) => {
        if (src instanceof GraphqlError) {
            return { type: 'gql', errors: src.errors };
        } else if (src instanceof GraphqlUnknownError) {
            return { type: 'unknown', message: src.message };
        } else if (src.message && typeof src.message === 'string') {
            return { type: 'unknown', message: src.message };
        } else {
            return { type: 'unknown', message: 'Unknown error' };
        }
    },
    parseError: (src: any) => {
        if (src.type === 'gql') {
            return new GraphqlError(src.errors);
        } else if (src.type === 'unknown') {
            return new GraphqlUnknownError(src.message);
        } else {
            return new GraphqlUnknownError('Unknown error');
        }
    }
}

export function jsonStringifyMinimized(src: any) {
    return JSON.stringify(src, null, 0)
}
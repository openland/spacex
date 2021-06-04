import { print, ASTNode } from 'graphql';

function replaceAll(src: string, find: string, replace: string) {
    while (src.indexOf(find) >= 0) {
        src = src.replace(find, replace);
    }
    return src;
}

export function astToString(ast: ASTNode) {
    let res = print(ast);
    // Replace new lines and tabs with spaces
    res = replaceAll(res, '\n', ' ');
    res = replaceAll(res, '\t', ' ');

    // Replace double spaces with single one
    res = replaceAll(res, '  ', ' ');

    // Punctuation
    res = replaceAll(res, ': ', ':');
    res = replaceAll(res, ' :', ':');
    res = replaceAll(res, ', ', ',');
    res = replaceAll(res, ' ,', ',');
    res = replaceAll(res, '( ', '(');
    res = replaceAll(res, ' (', '(');
    res = replaceAll(res, ') ', ')');
    res = replaceAll(res, ' )', ')');
    res = replaceAll(res, '{ ', '{');
    res = replaceAll(res, ' {', '{');
    res = replaceAll(res, '} ', '}');
    res = replaceAll(res, ' }', '}');
    return res;
}
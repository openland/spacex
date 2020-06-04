import * as React from 'react';

export class PriorityContext {
    readonly name: string;
    private _priority: number;

    constructor(name: string, initial: number) {
        this.name = name;
        this._priority = initial;
    }

    get priority() {
        return this._priority;
    }

    set priority(v: number) {
        this._priority = v;
    }
}

export const ReactPriorityContext = React.createContext<PriorityContext | null>(null);
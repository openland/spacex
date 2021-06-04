export class Output {
    private value: string = '';

    append(src: string) {
        this.value += src + '\n';
    }

    build() {
        return this.value;
    }
}
import { Record, RecordStore } from "./RecordStore";
import { collectMissingKeysRoot } from "./collectMissingKeys";
import { Selector, OutputTypeObject, OutputType, InputValue, obj, field, scalar, inline } from "../types";

describe('collectMissingKeys', () => {
    it('should collect missing keys from condition types', () => {
        let store = new RecordStore();

        let record1: Record = {
            key: 'root.$ref.chat',
            fields: {
                data: {
                    type: 'reference',
                    key: 'ref_chat'
                }
            }
        };

        let outputType = obj(
            field('chat', 'chat', {}, obj(
                field('name', 'name', {}, scalar('string')),
            ))
        )

        const getMissingKeys = (query: OutputTypeObject) => collectMissingKeysRoot('root', store, query, {}, {})

        expect(getMissingKeys(outputType).has('root.$ref.chat')).toBe(true);

        store.loadedRecord(record1);

        expect(getMissingKeys(outputType).has('ref_chat')).toBe(true);

        store.loadedRecord({
            key: 'ref_chat',
            fields: {
                __typeName: { type: 'string', value: 'Chat' },
                name: { type: 'string', value: 'value1' },
                testObj: { type: 'reference', key: 'ref_test_obj' }
            }
        });


        expect(getMissingKeys(outputType).size).toBe(0);

        let outputType2 = obj(
            field('chat', 'chat', {}, obj(
                field('name', 'name', {}, scalar('string')),
                field('testObj', 'testObj', {}, obj(
                    inline('Obj', obj(
                        field('obj2', 'chat', {}, obj(
                            field('name', 'name', {}, scalar('string')),
                        ))
                    ))
                )),

            ))
        );

        expect(getMissingKeys(outputType2).has('ref_test_obj')).toBe(true);

        store.loadedRecord({
            key: 'ref_test_obj',
            fields: {
                __typename: { type: 'string', value: 'Obj' },
                obj2: { type: 'reference', key: 'ref_obj2' },
            }
        });

        expect(getMissingKeys(outputType2).has('ref_obj2')).toBe(true);
    });
});

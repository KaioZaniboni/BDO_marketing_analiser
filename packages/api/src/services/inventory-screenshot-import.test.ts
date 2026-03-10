import { describe, expect, it } from 'vitest';
import {
    buildInventoryScreenshotImportInventoryItems,
    summarizeInventoryScreenshotImport,
} from './inventory-screenshot-import';

describe('inventory screenshot import service', () => {
    it('agrega linhas importadas pelo item final selecionado', () => {
        expect(buildInventoryScreenshotImportInventoryItems([
            {
                rawName: 'Açúcar',
                originalQuantity: 100,
                confirmedQuantity: 120,
                selectedItemId: 5401,
                score: 1,
                selectionSource: 'ocr',
            },
            {
                rawName: 'Acucar Mascavo',
                originalQuantity: 20,
                confirmedQuantity: 25,
                selectedItemId: 5401,
                score: 0.94,
                selectionSource: 'manual',
            },
        ])).toEqual([
            { itemId: 5401, quantity: 145 },
        ]);
    });

    it('resume linhas importadas e quantidade total confirmada', () => {
        expect(summarizeInventoryScreenshotImport([
            {
                rawName: 'Leite',
                originalQuantity: 300,
                confirmedQuantity: 280,
                selectedItemId: 7001,
                score: 0.97,
                selectionSource: 'auto',
            },
            {
                rawName: 'Farinha',
                originalQuantity: 50,
                confirmedQuantity: 50,
                selectedItemId: 7002,
                score: 1,
                selectionSource: 'ocr',
            },
        ])).toEqual({
            importedRowCount: 2,
            importedQuantityTotal: 330,
        });
    });
});
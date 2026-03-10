import { describe, expect, it } from 'vitest';
import {
    buildDefaultSelectedItemIds,
    buildInventoryImportBulkItems,
    buildInventoryScreenshotImportItems,
    countResolvedInventoryImportRows,
    getInventoryImportSelectionMeta,
    mergeInventoryImportEntries,
    parseInventoryOcrLineEntry,
    parseInventoryOcrText,
    parseInventoryOcrQuantity,
    prioritizeInventoryImportCandidates,
} from './inventory-import-utils';

describe('inventory import utils', () => {
    it('normaliza quantidades com separadores visuais do OCR', () => {
        expect(parseInventoryOcrQuantity('15.000')).toBe(15000);
        expect(parseInventoryOcrQuantity('2,500')).toBe(2500);
        expect(parseInventoryOcrQuantity('x 320')).toBe(320);
    });

    it('extrai linhas com nome + quantidade e ignora ruído', () => {
        expect(parseInventoryOcrText([
            'Açúcar 15.000',
            'Leite x320',
            'Peso LT 1.250',
            'Linha sem item válido',
        ].join('\n'))).toEqual([
            { rawName: 'Açúcar', quantity: 15000 },
            { rawName: 'Leite', quantity: 320 },
        ]);
    });

    it('extrai uma linha OCR individual para reutilização na evidência visual', () => {
        expect(parseInventoryOcrLineEntry('Açúcar x1.250')).toEqual({
            rawName: 'Açúcar',
            quantity: 1250,
        });
        expect(parseInventoryOcrLineEntry('Peso LT 1.250')).toBeNull();
    });

    it('mescla entradas repetidas vindas de múltiplas screenshots', () => {
        expect(mergeInventoryImportEntries([
            { rawName: 'Açúcar', quantity: 1000 },
            { rawName: 'Acucar', quantity: 2000 },
            { rawName: 'Leite', quantity: 300 },
        ])).toEqual([
            { rawName: 'Açúcar', quantity: 3000 },
            { rawName: 'Leite', quantity: 300 },
        ]);
    });

    it('gera itens de bulkUpsert apenas para linhas resolvidas e agrega ids repetidos', () => {
        const rows = [
            {
                rawName: 'Açúcar',
                normalizedName: 'acucar',
                quantity: 15000,
                status: 'matched' as const,
                matchedItemId: 5401,
                candidates: [],
            },
            {
                rawName: 'Essencia',
                normalizedName: 'essencia',
                quantity: 50,
                status: 'ambiguous' as const,
                matchedItemId: null,
                candidates: [],
            },
            {
                rawName: 'Acucar Mascavo',
                normalizedName: 'acucar mascavo',
                quantity: 500,
                status: 'ambiguous' as const,
                matchedItemId: null,
                candidates: [],
            },
        ];

        const selectedItemIds = buildDefaultSelectedItemIds(rows);
        selectedItemIds[1] = null;
        selectedItemIds[2] = 5401;

        expect(countResolvedInventoryImportRows(rows, selectedItemIds)).toBe(2);
        expect(buildInventoryImportBulkItems(rows, selectedItemIds)).toEqual([
            { itemId: 5401, quantity: 15500 },
        ]);
    });

    it('pré-seleciona automaticamente o melhor candidato visual quando a confiança é suficiente', () => {
        expect(buildDefaultSelectedItemIds([
            {
                rawName: 'Slot 01',
                normalizedName: 'slot 01',
                quantity: 320,
                status: 'ambiguous' as const,
                matchedItemId: null,
                recognitionMode: 'icon' as const,
                candidates: [
                    { id: 9101, name: 'Açúcar', iconUrl: '/icons/acucar.png', grade: 0, score: 0.87 },
                    { id: 9102, name: 'Farinha', iconUrl: '/icons/farinha.png', grade: 0, score: 0.82 },
                ],
            },
        ])).toEqual([9101]);
    });

    it('gera payload da importação por screenshot com score e origem da seleção', () => {
        const rows = [
            {
                rawName: 'Açúcar',
                normalizedName: 'acucar',
                quantity: 15000,
                originalQuantity: 14900,
                status: 'matched' as const,
                matchedItemId: 5401,
                candidates: [
                    { id: 5401, name: 'Açúcar', iconUrl: null, grade: 0, score: 1 },
                ],
            },
            {
                rawName: 'Essencia',
                normalizedName: 'essencia',
                quantity: 45,
                originalQuantity: 50,
                status: 'ambiguous' as const,
                matchedItemId: null,
                candidates: [],
            },
        ];

        expect(buildInventoryScreenshotImportItems(rows, [5401, 7001], [
            null,
            { selectionSource: 'auto', score: 0.93 },
        ])).toEqual([
            {
                rawName: 'Açúcar',
                originalQuantity: 14900,
                confirmedQuantity: 15000,
                selectedItemId: 5401,
                score: 1,
                selectionSource: 'ocr',
            },
            {
                rawName: 'Essencia',
                originalQuantity: 50,
                confirmedQuantity: 45,
                selectedItemId: 7001,
                score: 0.93,
                selectionSource: 'auto',
            },
        ]);
    });

    it('marca auto-seleção quando o melhor candidato manual é aplicado automaticamente', () => {
        const row = {
            rawName: 'Essencia',
            normalizedName: 'essencia',
            quantity: 20,
            status: 'ambiguous' as const,
            matchedItemId: null,
            candidates: [],
        };

        expect(getInventoryImportSelectionMeta(
            row,
            101,
            [{ id: 101, name: 'Essência da Floresta', iconUrl: null, grade: 2, score: 0.95 }],
            101,
        )).toEqual({
            selectionSource: 'auto',
            score: 0.95,
        });
    });

    it('marca auto-seleção quando a V2 pré-seleciona o melhor candidato visual', () => {
        const row = {
            rawName: 'Slot 01',
            normalizedName: 'slot 01',
            quantity: 28,
            status: 'ambiguous' as const,
            matchedItemId: null,
            recognitionMode: 'icon' as const,
            candidates: [
                { id: 101, name: 'Essência da Floresta', iconUrl: null, grade: 2, score: 0.86 },
                { id: 102, name: 'Seiva de Bordo', iconUrl: null, grade: 1, score: 0.8 },
            ],
        };

        expect(getInventoryImportSelectionMeta(row, 101)).toEqual({
            selectionSource: 'auto',
            score: 0.86,
        });
    });

    it('prioriza candidatos manuais pelo nome mais próximo da busca', () => {
        const prioritized = prioritizeInventoryImportCandidates('Açúcar', [
            { id: 5402, name: 'Açúcar Mascavo', iconUrl: null, grade: 1, score: 0 },
            { id: 5401, name: 'Acucar', iconUrl: null, grade: 0, score: 0 },
            { id: 5403, name: 'Leite', iconUrl: null, grade: 0, score: 0 },
        ]);

        expect(prioritized.map((candidate) => candidate.id)).toEqual([5401, 5402, 5403]);
        expect(prioritized[0]?.score ?? 0).toBeGreaterThan(prioritized[1]?.score ?? 0);
    });
});
import { describe, expect, it } from 'vitest';
import {
    buildInventoryImportPreview,
    normalizeInventoryImportName,
    scoreInventoryImportItemMatch,
} from './inventory-import';

describe('inventory import service', () => {
    it('normaliza acentos e ruído para matching estável', () => {
        expect(normalizeInventoryImportName('  Açúcar   Mascavo!! ')).toBe('acucar mascavo');
    });

    it('dá score máximo para correspondência exata sem acento', () => {
        expect(scoreInventoryImportItemMatch('Acucar', 'Açúcar')).toBe(1);
    });

    it('marca correspondência exata como matched', () => {
        const preview = buildInventoryImportPreview([
            { rawName: 'Acucar', quantity: 320 },
        ], [
            { id: 5401, name: 'Açúcar', iconUrl: null, grade: 0 },
            { id: 5402, name: 'Farinha', iconUrl: null, grade: 0 },
        ]);

        expect(preview[0]).toMatchObject({
            rawName: 'Acucar',
            quantity: 320,
            status: 'matched',
            matchedItemId: 5401,
        });
    });

    it('marca nomes genéricos com múltiplas opções como ambiguous', () => {
        const preview = buildInventoryImportPreview([
            { rawName: 'Essencia', quantity: 18 },
        ], [
            { id: 1001, name: 'Essência de Licor', iconUrl: null, grade: 2 },
            { id: 1002, name: 'Essência de Reagente', iconUrl: null, grade: 2 },
            { id: 1003, name: 'Leite', iconUrl: null, grade: 1 },
        ]);

        expect(preview[0]?.status).toBe('ambiguous');
        expect(preview[0]?.matchedItemId).toBeNull();
        expect(preview[0]?.candidates).toHaveLength(2);
    });

    it('marca como unmatched quando não encontra candidato minimamente confiável', () => {
        const preview = buildInventoryImportPreview([
            { rawName: 'zzzz item', quantity: 1 },
        ], [
            { id: 2001, name: 'Leite', iconUrl: null, grade: 1 },
            { id: 2002, name: 'Farinha', iconUrl: null, grade: 1 },
        ]);

        expect(preview[0]).toMatchObject({
            status: 'unmatched',
            matchedItemId: null,
            candidates: [],
        });
    });
});
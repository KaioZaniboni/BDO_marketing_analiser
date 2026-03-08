import { describe, expect, it } from 'vitest';
import {
    buildRecipeCurationDraft,
    mergeRecipeCurations,
    normalizeRecipeCurationSearchTerm,
    normalizeRecipeCurationTypeFilter,
    parseRecipeCurationDraft,
    serializeRecipeCurationDraft,
} from './recipe-curation';

describe('recipe-curation', () => {
    it('normaliza filtros de tipo e busca com fallback seguro', () => {
        expect(normalizeRecipeCurationTypeFilter('cooking')).toBe('cooking');
        expect(normalizeRecipeCurationTypeFilter('INVALID')).toBe('all');
        expect(normalizeRecipeCurationSearchTerm(['  vinegar  '])).toBe('vinegar');
    });

    it('gera draft inicial a partir do craft canônico preservando defaults por slot', () => {
        const draft = buildRecipeCurationDraft({
            canonicalKey: 'cooking:1:beer',
            craftName: 'Beer',
            variants: [
                { legacyRecipeId: 20, isPrimary: false },
                { legacyRecipeId: 10, isPrimary: true },
            ],
            slots: [
                {
                    sortOrder: 1,
                    slotKey: 'water',
                    label: 'Água',
                    options: [{ itemId: 2, quantity: 6, isDefault: false }],
                },
                {
                    sortOrder: 0,
                    slotKey: 'grain',
                    label: 'Grão',
                    options: [
                        { itemId: 1, quantity: 5, isDefault: true },
                        { itemId: 11, quantity: 5, isDefault: false },
                    ],
                },
            ],
        });

        expect(draft.legacyRecipeIds).toEqual([10, 20]);
        expect(draft.primaryLegacyRecipeId).toBe(10);
        expect(draft.notes).toContain('Beer');
        expect(draft.slots).toEqual([
            {
                index: 0,
                slotKey: 'grain',
                label: 'Grão',
                defaultItemId: 1,
                defaultQuantity: 5,
            },
            {
                index: 1,
                slotKey: 'water',
                label: 'Água',
                defaultItemId: 2,
                defaultQuantity: 6,
            },
        ]);
    });

    it('reaproveita curadoria existente ao gerar o draft editável', () => {
        const draft = buildRecipeCurationDraft({
            canonicalKey: 'cooking:2:vinegar',
            craftName: 'Vinegar',
            variants: [{ legacyRecipeId: 454, isPrimary: true }],
            slots: [{
                sortOrder: 0,
                slotKey: 'fruit',
                label: 'Fruta',
                options: [{ itemId: 100, quantity: 1, isDefault: true }],
            }],
            currentCuration: {
                legacyRecipeIds: [454, 455],
                primaryLegacyRecipeId: 455,
                nameOverride: 'Vinagre',
                notes: 'Usar nomenclatura curada.',
                slots: [{ index: 0, slotKey: 'fruit-slot', label: 'Fruta fresca', defaultItemId: 101, defaultQuantity: 2 }],
            },
        });

        expect(draft.primaryLegacyRecipeId).toBe(455);
        expect(draft.nameOverride).toBe('Vinagre');
        expect(draft.slots[0]).toEqual({
            index: 0,
            slotKey: 'fruit-slot',
            label: 'Fruta fresca',
            defaultItemId: 101,
            defaultQuantity: 2,
        });
        expect(serializeRecipeCurationDraft(draft)).toContain('"canonicalKey": "cooking:2:vinegar"');
    });

    it('faz parse e valida o draft JSON com regras estritas', () => {
        const parsed = parseRecipeCurationDraft(JSON.stringify({
            canonicalKey: 'cooking:2:vinegar',
            legacyRecipeIds: [455, 454, 455],
            primaryLegacyRecipeId: 455,
            notes: '  Ajuste operacional  ',
            slots: [{ index: 0, slotKey: 'fruit', defaultItemId: 101, defaultQuantity: 2 }],
        }));

        expect(parsed).toEqual({
            canonicalKey: 'cooking:2:vinegar',
            legacyRecipeIds: [454, 455],
            primaryLegacyRecipeId: 455,
            nameOverride: null,
            notes: 'Ajuste operacional',
            slots: [{ index: 0, slotKey: 'fruit', label: null, defaultItemId: 101, defaultQuantity: 2 }],
        });

        expect(() => parseRecipeCurationDraft(JSON.stringify({
            canonicalKey: 'cooking:2:vinegar',
            legacyRecipeIds: [454],
            slots: [{ index: 0, defaultItemId: 101 }],
        }))).toThrow('slotKey é obrigatório');
    });

    it('mescla JSON e banco com precedência explícita do banco', () => {
        const merged = mergeRecipeCurations({
            jsonRecords: [{ canonicalKey: 'cooking:2:vinegar', notes: 'baseline json', legacyRecipeIds: [454] }],
            dbRecords: [{ canonicalKey: 'cooking:2:vinegar', notes: 'override db', legacyRecipeIds: [454] }],
        });

        expect(merged.sourceByCanonicalKey.get('cooking:2:vinegar')).toBe('db');
        expect(merged.effectiveByCanonicalKey.get('cooking:2:vinegar')?.notes).toBe('override db');
        expect(merged.jsonByCanonicalKey.get('cooking:2:vinegar')?.notes).toBe('baseline json');
    });
});
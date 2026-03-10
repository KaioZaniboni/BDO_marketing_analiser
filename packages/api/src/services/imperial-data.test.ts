import { describe, expect, it } from 'vitest';
import { getImperialBonus, IMPERIAL_RECIPE_ENTRIES, IMPERIAL_RECIPES_MAPPING, IMPERIAL_TIERS } from './imperial-data';

describe('imperial data', () => {
    it('mantém o mapping completo, único e tipado por tier', () => {
        const ids = IMPERIAL_RECIPE_ENTRIES.map((entry) => entry.resultItemId);
        expect(new Set(ids).size).toBe(IMPERIAL_RECIPE_ENTRIES.length);
        expect(IMPERIAL_RECIPE_ENTRIES.every((entry) => entry.qtyRequired > 0)).toBe(true);
        expect(IMPERIAL_RECIPES_MAPPING[9602]).toMatchObject({
            type: 'cooking',
            tierKey: 'GURU',
            qtyRequired: 8,
        });
        expect(IMPERIAL_RECIPES_MAPPING[672]).toMatchObject({
            type: 'alchemy',
            tierKey: 'GURU',
            qtyRequired: 6,
        });
        expect(IMPERIAL_TIERS.MASTER.name).toBe('Mestre');
    });

    it('retorna o bônus imperial correto da tabela de maestria', () => {
        expect(getImperialBonus(0)).toBe(0);
        expect(getImperialBonus(500)).toBeCloseTo(21.16, 2);
        expect(getImperialBonus(1000)).toBeCloseTo(67.24, 2);
        expect(getImperialBonus(1500)).toBeCloseTo(111.09, 2);
        expect(getImperialBonus(2000)).toBeCloseTo(144.96, 2);
    });
});

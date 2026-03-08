import { describe, expect, it } from 'vitest';
import { getRecipeVariantKey } from './recipe-identity';
import {
    filterRecipesByTypes,
    normalizeRecipeType,
} from './recipe-classification';

describe('recipe classification', () => {
    it('restores the canonical type for contaminated recipe records', () => {
        expect(normalizeRecipeType({ id: 580, type: 'alchemy' })).toMatchObject({
            id: 580,
            type: 'cooking',
        });

        expect(normalizeRecipeType({ id: 347, type: 'cooking' })).toMatchObject({
            id: 347,
            type: 'alchemy',
        });
    });

    it('filters after normalizing so cooking and alchemy do not bleed into each other', () => {
        const contaminatedRecipes = [
            { id: 580, type: 'alchemy', name: 'Vinho Fermentado de Khalk', resultItemId: 9469 },
            { id: 347, type: 'cooking', name: 'Solvente de Metal', resultItemId: 4076 },
        ];

        expect(filterRecipesByTypes(contaminatedRecipes, ['cooking']).map((recipe) => recipe.id)).toEqual([580]);
        expect(filterRecipesByTypes(contaminatedRecipes, ['alchemy']).map((recipe) => recipe.id)).toEqual([347]);
    });

    it('builds a stable variant key in the shared pure helper', () => {
        expect(getRecipeVariantKey({
            type: 'cooking',
            resultItemId: 9066,
            name: 'Vinagre',
        })).toBe('cooking:9066:vinagre');
    });
});

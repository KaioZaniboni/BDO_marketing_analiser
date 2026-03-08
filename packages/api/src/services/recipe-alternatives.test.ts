import { describe, expect, it } from 'vitest';
import { buildIngredientAlternativesBySlot } from './recipe-alternatives';

describe('recipe alternatives service', () => {
    it('groups valid alternatives by slot, preserves base first and maps sub-recipes', () => {
        const recipe = {
            ingredients: [
                { itemId: 10, quantity: 2, sortOrder: 0, item: { name: 'A' } },
                { itemId: 20, quantity: 1, sortOrder: 1, item: { name: 'X' } },
            ],
        };
        const variants = [
            recipe,
            {
                ingredients: [
                    { itemId: 11, quantity: 2, sortOrder: 0, item: { name: 'B' } },
                    { itemId: 20, quantity: 1, sortOrder: 1, item: { name: 'X' } },
                ],
            },
            {
                ingredients: [
                    { itemId: 10, quantity: 2, sortOrder: 0, item: { name: 'A' } },
                    { itemId: 21, quantity: 1, sortOrder: 1, item: { name: 'Y' } },
                ],
            },
        ];
        const subRecipes = new Map([
            [11, { id: 1001, type: 'cooking' as const }],
            [21, { id: 1002, type: 'alchemy' as const }],
        ]);

        const alternatives = buildIngredientAlternativesBySlot(recipe, variants, (itemId) => subRecipes.get(itemId));

        expect(alternatives[0]?.map((ingredient) => ingredient.itemId)).toEqual([10, 11]);
        expect(alternatives[1]?.map((ingredient) => ingredient.itemId)).toEqual([20, 21]);
        expect(alternatives[0]?.[1]).toMatchObject({ subRecipeId: 1001, subRecipeType: 'cooking' });
        expect(alternatives[1]?.[1]).toMatchObject({ subRecipeId: 1002, subRecipeType: 'alchemy' });
    });
});
import { describe, expect, it } from 'vitest';
import { buildCanonicalIngredientAlternatives, mapCanonicalVariantToRecipe } from './canonical-recipe-reader';

function createItem(id: number, name: string) {
    return {
        id,
        name,
        categoryId: null,
        subCategoryId: null,
        weight: 0,
        grade: 0,
        isTradeable: true,
        iconUrl: null,
        prices: [],
    };
}

describe('canonical recipe reader', () => {
    it('maps canonical variants to legacy-compatible recipes using slot order and canonical craft name', () => {
        const recipe = mapCanonicalVariantToRecipe({
            legacyRecipeId: 454,
            name: 'Beer Alt',
            type: 'cooking',
            resultItemId: 9213,
            resultQuantity: 1,
            procItemId: 2352,
            procQuantity: 1,
            masteryBonusPct: 0,
            experience: 400,
            cookTimeSeconds: 1.2,
            categoryId: null,
            resultItem: createItem(9213, 'Beer'),
            procItem: createItem(2352, 'Cold Draft Beer'),
            craft: { name: 'Beer', slots: [] },
            slotSelections: [
                { sortOrder: 1, slot: { sortOrder: 1 }, slotOption: { itemId: 20, quantity: 6, sortOrder: 0, item: createItem(20, 'Water') } },
                { sortOrder: 0, slot: { sortOrder: 0 }, slotOption: { itemId: 10, quantity: 5, sortOrder: 0, item: createItem(10, 'Grain') } },
            ],
        });

        expect(recipe).toMatchObject({ id: 454, name: 'Beer', type: 'cooking' });
        expect(recipe?.ingredients.map((ingredient) => ingredient.itemId)).toEqual([10, 20]);
    });

    it('recovers max output quantities from the raw legacy snapshot', () => {
        const recipe = mapCanonicalVariantToRecipe({
            legacyRecipeId: 457,
            name: 'Pickled Vegetables',
            type: 'cooking',
            resultItemId: 9202,
            resultQuantity: 1,
            procItemId: 9281,
            procQuantity: 1,
            masteryBonusPct: 0,
            experience: 400,
            cookTimeSeconds: 1.2,
            categoryId: null,
            resultItem: createItem(9202, 'Pickled Vegetables'),
            procItem: createItem(9281, 'Sweet and Sour Pickled Vegetables'),
            craft: { name: 'Pickled Vegetables', slots: [] },
            slotSelections: [],
        });

        expect(recipe).toMatchObject({
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procQuantity: 1,
            procMaxQuantity: 2,
        });
    });

    it('builds explicit slot alternatives preserving the selected option first and mapping sub-recipes', () => {
        const alternatives = buildCanonicalIngredientAlternatives(
            [{
                sortOrder: 0,
                options: [
                    { itemId: 10, quantity: 5, sortOrder: 1, item: createItem(10, 'Potato') },
                    { itemId: 11, quantity: 5, sortOrder: 0, item: createItem(11, 'Corn') },
                ],
            }],
            [{
                sortOrder: 0,
                slot: { sortOrder: 0 },
                slotOption: { itemId: 10, quantity: 5, sortOrder: 1, item: createItem(10, 'Potato') },
            }],
            (itemId) => itemId === 11 ? { id: 999, type: 'processing' } : null,
        );

        expect(alternatives[0]?.map((ingredient) => ingredient.itemId)).toEqual([10, 11]);
        expect(alternatives[0]?.[1]).toMatchObject({ subRecipeId: 999, subRecipeType: 'processing' });
    });
});

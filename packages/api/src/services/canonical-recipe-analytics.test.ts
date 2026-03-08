import { describe, expect, it } from 'vitest';
import type { CanonicalReadableRecipe } from './canonical-recipe-reader';
import {
    analyzeCanonicalRecipeProfitability,
    buildCanonicalImperialRanking,
    buildCanonicalRanking,
} from './canonical-recipe-analytics';

function createItem(id: number, name: string, price: number, volume: number = 0, stock: number = 100) {
    return {
        id,
        name,
        categoryId: null,
        subCategoryId: null,
        weight: 0,
        grade: 0,
        isTradeable: true,
        iconUrl: null,
        prices: [{
            basePrice: BigInt(price),
            lastSoldPrice: BigInt(price),
            currentStock: stock,
            totalTrades: BigInt(volume),
            priceMin: BigInt(price),
            priceMax: BigInt(price),
        }],
        priceHistory: volume > 0 ? [{ price: BigInt(price), volume, recordedDate: new Date('2026-03-08') }] : [],
    };
}

function createRecipe(input: {
    id: number;
    name: string;
    type?: CanonicalReadableRecipe['type'];
    resultItemId: number;
    resultPrice: number;
    resultQuantity?: number;
    volume?: number;
    stock?: number;
    ingredients: Array<{ itemId: number; quantity: number; price: number; name?: string }>;
}): CanonicalReadableRecipe {
    return {
        id: input.id,
        name: input.name,
        type: input.type ?? 'cooking',
        resultItemId: input.resultItemId,
        resultQuantity: input.resultQuantity ?? 1,
        procItemId: null,
        procQuantity: null,
        masteryBonusPct: 0,
        experience: 0,
        cookTimeSeconds: 1,
        categoryId: null,
        resultItem: createItem(input.resultItemId, `${input.name} Result`, input.resultPrice, input.volume, input.stock),
        procItem: null,
        ingredients: input.ingredients.map((ingredient, index) => ({
            itemId: ingredient.itemId,
            quantity: ingredient.quantity,
            sortOrder: index,
            item: createItem(ingredient.itemId, ingredient.name ?? `Ingredient ${ingredient.itemId}`, ingredient.price),
        })),
    };
}

describe('canonical recipe analytics', () => {
    it('analisa lucratividade usando snapshots canônicos e craftCount informado', () => {
        const recipe = createRecipe({
            id: 10,
            name: 'Beer',
            resultItemId: 672,
            resultPrice: 1_000,
            resultQuantity: 2,
            ingredients: [
                { itemId: 1, quantity: 2, price: 100, name: 'Grain' },
                { itemId: 2, quantity: 1, price: 50, name: 'Sugar' },
            ],
        });

        const result = analyzeCanonicalRecipeProfitability(
            recipe,
            new Map<number, number>([[1, 3]]),
            { baseTaxRate: 0.35, hasValuePack: false, hasMerchantRing: false, familyFame: 0 },
            2,
        );

        expect(result.match.totalMissingCost).toBe(200);
        expect(result.match.maxCraftable).toBe(0);
        expect(result.analysis.recipeName).toBe('Beer');
        expect(result.analysis.missingItemsCost).toBe(200);
        expect(result.analysis.recommendation).toBe('CRAFT');
    });

    it('escolhe a variante canônica mais barata por nome no ranking imperial', () => {
        const cheaper = createRecipe({
            id: 11,
            name: 'Beer',
            resultItemId: 672,
            resultPrice: 900,
            ingredients: [{ itemId: 10, quantity: 1, price: 100 }],
        });
        const expensive = createRecipe({
            id: 12,
            name: 'Beer',
            resultItemId: 672,
            resultPrice: 900,
            ingredients: [{ itemId: 11, quantity: 1, price: 200 }],
        });

        const ranking = buildCanonicalImperialRanking([expensive, cheaper], { mastery: 0 });

        expect(ranking).toHaveLength(1);
        expect(ranking[0]?.id).toBe(11);
        expect(ranking[0]?.costPerBox).toBe(6_000);
    });

    it('rankeia receitas canônicas com base nos snapshots materializados', () => {
        const best = createRecipe({
            id: 21,
            name: 'High Profit Meal',
            resultItemId: 9_001,
            resultPrice: 2_000,
            volume: 500,
            stock: 1,
            ingredients: [{ itemId: 30, quantity: 1, price: 100 }],
        });
        const worst = createRecipe({
            id: 22,
            name: 'Low Profit Meal',
            resultItemId: 9_002,
            resultPrice: 250,
            volume: 1,
            stock: 500,
            ingredients: [{ itemId: 31, quantity: 1, price: 240 }],
        });

        const ranking = buildCanonicalRanking([best, worst]);

        expect(ranking).toHaveLength(2);
        expect(ranking[0]).toMatchObject({ recipeId: 21, rank: 1 });
        expect(ranking[1]).toMatchObject({ recipeId: 22, rank: 2 });
    });
});
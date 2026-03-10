import { describe, expect, it } from 'vitest';
import type { CanonicalReadableRecipe } from './canonical-recipe-reader';
import {
    analyzeCanonicalRecipeProfitability,
    buildCanonicalImperialInventoryCoverage,
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
    resultMaxQuantity?: number | null;
    procItemId?: number | null;
    procPrice?: number;
    procQuantity?: number | null;
    procMaxQuantity?: number | null;
    volume?: number;
    procVolume?: number;
    stock?: number;
    cookTimeSeconds?: number;
    ingredients: Array<{ itemId: number; quantity: number; price: number; name?: string }>;
}): CanonicalReadableRecipe {
    return {
        id: input.id,
        name: input.name,
        type: input.type ?? 'cooking',
        resultItemId: input.resultItemId,
        resultQuantity: input.resultQuantity ?? 1,
        resultMaxQuantity: input.resultMaxQuantity ?? input.resultQuantity ?? 1,
        procItemId: input.procItemId ?? null,
        procQuantity: input.procQuantity ?? null,
        procMaxQuantity: input.procMaxQuantity ?? null,
        masteryBonusPct: 0,
        experience: 0,
        cookTimeSeconds: input.cookTimeSeconds ?? 1,
        categoryId: null,
        resultItem: createItem(input.resultItemId, `${input.name} Result`, input.resultPrice, input.volume, input.stock),
        procItem: input.procItemId && input.procPrice
            ? createItem(input.procItemId, `${input.name} Proc`, input.procPrice, input.procVolume, input.stock)
            : null,
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
            type: 'alchemy',
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

    it('escolhe a variante canônica mais barata por item imperial e calcula custo por caixa com saída esperada', () => {
        const cheaper = createRecipe({
            id: 11,
            name: 'Beer',
            type: 'alchemy',
            resultItemId: 672,
            resultPrice: 900,
            resultQuantity: 2,
            resultMaxQuantity: 2,
            ingredients: [{ itemId: 10, quantity: 1, price: 100 }],
        });
        const expensive = createRecipe({
            id: 12,
            name: 'Beer',
            type: 'alchemy',
            resultItemId: 672,
            resultPrice: 900,
            resultQuantity: 2,
            resultMaxQuantity: 2,
            ingredients: [{ itemId: 11, quantity: 1, price: 200 }],
        });

        const ranking = buildCanonicalImperialRanking([expensive, cheaper], { mastery: 0 });

        expect(ranking).toHaveLength(1);
        expect(ranking[0]).toMatchObject({
            id: 11,
            targetItemId: 672,
            costPerBox: 300,
            qtyRequired: 6,
        });
    });

    it('inclui proc item imperial como linha própria e calcula saída rara', () => {
        const recipe = createRecipe({
            id: 593,
            name: 'Balenos Meal',
            type: 'cooking',
            resultItemId: 9601,
            resultPrice: 100_000,
            resultQuantity: 1,
            resultMaxQuantity: 1,
            procItemId: 9602,
            procPrice: 180_000,
            procQuantity: 1,
            procMaxQuantity: 1,
            ingredients: [{ itemId: 30, quantity: 10, price: 1_000 }],
        });

        const ranking = buildCanonicalImperialRanking([recipe], { mastery: 1000, cookingTimeSeconds: 1.2 });
        const specialMeal = ranking.find((row) => row.targetItemId === 9602);

        expect(ranking).toHaveLength(2);
        expect(specialMeal).toMatchObject({
            recipeId: 593,
            targetOutputKind: 'proc',
            qtyRequired: 8,
        });
        expect(specialMeal?.expectedOutputPerCraft).toBeGreaterThan(0.2);
        expect(specialMeal?.craftSecondsPerBox).toBeGreaterThan(0);
    });

    it('calcula cobertura do inventário por caixa imperial', () => {
        const recipe = createRecipe({
            id: 620,
            name: 'Elixir da Persistencia',
            type: 'alchemy',
            resultItemId: 1184,
            resultPrice: 75_000,
            resultQuantity: 1,
            ingredients: [
                { itemId: 100, quantity: 2, price: 500 },
                { itemId: 101, quantity: 1, price: 1_000 },
            ],
        });

        const ranking = buildCanonicalImperialRanking([recipe], { mastery: 0 });
        const coverage = buildCanonicalImperialInventoryCoverage(
            ranking,
            new Map<number, number>([
                [100, 20],
                [101, 2],
            ]),
        );

        expect(coverage[0]?.maxBoxesFromInventory).toBe(0);
        expect(coverage[0]?.inventoryCoveragePct).toBe(33.33333333333333);
        expect(coverage[0]?.missingIngredients[0]).toMatchObject({ itemId: 101 });
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

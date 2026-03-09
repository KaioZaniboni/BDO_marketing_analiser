import { describe, expect, it } from 'vitest';
import {
    buildRecipeContext,
    buildOverviewRows,
    buildRecipeTree,
    getDefaultCalculatorState,
    getDefaultCraftingSettings,
    getNetSaleMultiplier,
    getRecipeRates,
    getWeightSummary,
    type CalculatorItem,
    type CalculatorRecipe,
} from './calculator';

function createItem(
    id: number,
    name: string,
    price: number,
    weight = 10,
    overrides: Partial<CalculatorItem> = {},
): CalculatorItem {
    return {
        id,
        name,
        weight,
        grade: 0,
        iconUrl: null,
        prices: [
            {
                basePrice: price,
                lastSoldPrice: price,
                currentStock: 100,
                totalTrades: 1_000,
            },
        ],
        priceHistory: [],
        ...overrides,
    };
}

describe('crafting calculator', () => {
    it('matches the BDOLytics default market tax multiplier', () => {
        expect(getNetSaleMultiplier(getDefaultCraftingSettings())).toBeCloseTo(0.84825, 5);
    });

    it('uses cooking mastery defaults for output, rare proc and mass proc rates', () => {
        const settings = getDefaultCraftingSettings();
        const recipe: CalculatorRecipe = {
            id: 1,
            name: 'Beer',
            type: 'cooking',
            experience: 400,
            cookTimeSeconds: 1.2,
            resultItemId: 100,
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procItemId: 101,
            procQuantity: 1,
            procMaxQuantity: 2,
            resultItem: createItem(100, 'Beer', 1_000),
            procItem: createItem(101, 'Cold Draft Beer', 5_000),
            ingredients: [
                { itemId: 9001, quantity: 5, sortOrder: 0, item: createItem(9001, 'Grain', 20) },
            ],
        };

        const rates = getRecipeRates(recipe, settings, false, true);

        expect(rates.normalProcRate).toBeCloseTo(2.76715, 5);
        expect(rates.rareProcRate).toBeCloseTo(0.409338, 5);
        expect(rates.massProcRate).toBeCloseTo(4.0591, 4);
        expect(rates.timePerAction).toBeCloseTo(1.2, 5);
    });

    it('builds cooking outputs including rare proc and byproduct exchange value', () => {
        const settings = getDefaultCraftingSettings();
        const state = {
            ...getDefaultCalculatorState(),
            customPrices: {
                9065: 1_000,
            },
        };

        const recipe: CalculatorRecipe = {
            id: 1,
            name: 'Beer',
            type: 'cooking',
            experience: 400,
            cookTimeSeconds: 1.2,
            resultItemId: 100,
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procItemId: 101,
            procQuantity: 1,
            procMaxQuantity: 2,
            resultItem: createItem(100, 'Beer', 1_000),
            procItem: createItem(101, 'Cold Draft Beer', 5_000),
            ingredients: [
                { itemId: 9001, quantity: 5, sortOrder: 0, item: createItem(9001, 'Grain', 20) },
            ],
        };

        const tree = buildRecipeTree({
            recipes: [recipe],
            rootRecipeId: 1,
            craftQuantity: 1_000,
            settings,
            state,
        });

        expect(tree).not.toBeNull();
        expect(tree?.outputs.find((row) => row.kind === 'normal')?.quantity).toBeCloseTo(2_767.15, 2);
        expect(tree?.outputs.find((row) => row.kind === 'rare')?.quantity).toBeCloseTo(409.33928, 3);
        expect(tree?.outputs.find((row) => row.kind === 'byproduct')).toMatchObject({
            itemId: 9065,
            name: 'Leite',
            source: 'custom',
            unitPrice: 1_000,
        });
        expect(tree?.outputs.find((row) => row.kind === 'byproduct')?.quantity).toBeCloseTo(283.2, 2);
        expect(tree?.craftingCost).toBeCloseTo(100_000, 0);
        expect(tree?.totalTime).toBeCloseTo(295.632, 3);
    });

    it('reuses build context without changing recipe tree results', () => {
        const settings = getDefaultCraftingSettings();
        const state = getDefaultCalculatorState();
        const recipe: CalculatorRecipe = {
            id: 1,
            name: 'Beer',
            type: 'cooking',
            experience: 400,
            cookTimeSeconds: 1.2,
            resultItemId: 100,
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procItemId: 101,
            procQuantity: 1,
            procMaxQuantity: 2,
            resultItem: createItem(100, 'Beer', 1_000),
            procItem: createItem(101, 'Cold Draft Beer', 5_000),
            ingredients: [
                { itemId: 9001, quantity: 5, sortOrder: 0, item: createItem(9001, 'Grain', 20) },
            ],
        };

        const context = buildRecipeContext({ recipes: [recipe], settings, state });
        const withoutContext = buildRecipeTree({
            recipes: [recipe],
            rootRecipeId: 1,
            craftQuantity: 1_000,
            settings,
            state,
        });
        const withContext = buildRecipeTree({
            recipes: [recipe],
            rootRecipeId: 1,
            craftQuantity: 1_000,
            settings,
            state,
            context,
        });

        expect(withContext).toEqual(withoutContext);
    });

    it('respects alternatives by slot and selected material when building the tree', () => {
        const settings = getDefaultCraftingSettings();
        const flour = createItem(10, 'Flour', 100);
        const potato = createItem(11, 'Potato Dough', 140);
        const water = createItem(20, 'Mineral Water', 30);

        const rootRecipe: CalculatorRecipe = {
            id: 1,
            name: 'Simple Dough',
            type: 'cooking',
            experience: 100,
            cookTimeSeconds: 1,
            resultItemId: 100,
            resultQuantity: 1,
            resultItem: createItem(100, 'Dough', 500),
            procItem: null,
            ingredients: [
                { itemId: 10, quantity: 1, sortOrder: 0, item: flour },
                { itemId: 20, quantity: 1, sortOrder: 1, item: water },
            ],
        };
        const variantRecipe: CalculatorRecipe = {
            ...rootRecipe,
            id: 2,
            ingredients: [
                { itemId: 11, quantity: 1, sortOrder: 0, item: potato },
                { itemId: 20, quantity: 1, sortOrder: 1, item: water },
            ],
        };
        const subRecipe: CalculatorRecipe = {
            id: 3,
            name: 'Potato Dough',
            type: 'processing',
            experience: 0,
            cookTimeSeconds: 1,
            resultItemId: 11,
            resultQuantity: 1,
            resultItem: potato,
            procItem: null,
            ingredients: [
                { itemId: 12, quantity: 2, sortOrder: 0, item: createItem(12, 'Potato', 50) },
            ],
        };

        const state = {
            ...getDefaultCalculatorState(),
            selectedMaterials: {
                1: {
                    0: 11,
                },
            },
        };

        const tree = buildRecipeTree({
            recipes: [rootRecipe, variantRecipe, subRecipe],
            rootRecipeId: 1,
            craftQuantity: 10,
            settings,
            state,
        });

        expect(tree).not.toBeNull();
        expect(tree?.ingredientAlternatives[0]?.map((ingredient) => ingredient.itemId)).toEqual([10, 11]);
        expect(tree?.children[0]).toMatchObject({
            recipeId: 3,
            itemId: 11,
            craftingType: 'processing',
        });
    });

    it('computes weight capacity from flattened ingredient weight', () => {
        const summary = getWeightSummary(
            [
                {
                    itemId: 9001,
                    name: 'Grain',
                    quantity: 5_000,
                    unitPrice: 20,
                    totalCost: 100_000,
                    taxed: false,
                    source: 'vendor',
                    totalTrades: 0,
                    currentStock: 0,
                    weightPerUnit: 0.1,
                },
            ],
            1_000,
            getDefaultCraftingSettings(),
        );

        expect(summary.totalWeight).toBeCloseTo(500, 5);
        expect(summary.weightPerCraft).toBeCloseTo(0.5, 5);
        expect(summary.availableWeight).toBeCloseTo(2_100, 5);
        expect(summary.maxCrafts).toBe(4_200);
    });

    it('uses latest historical volume for overview rows instead of totalTrades snapshot', () => {
        const settings = getDefaultCraftingSettings();
        const state = getDefaultCalculatorState();
        const recipe: CalculatorRecipe = {
            id: 1,
            name: 'Beer',
            type: 'cooking',
            experience: 400,
            cookTimeSeconds: 1.2,
            resultItemId: 100,
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procItemId: 101,
            procQuantity: 1,
            procMaxQuantity: 2,
            resultItem: createItem(100, 'Beer', 1_000, 10, {
                prices: [{ basePrice: 1_000, lastSoldPrice: 1_000, currentStock: 100, totalTrades: 999_999 }],
                priceHistory: [
                    { price: 1_000, volume: 42, recordedDate: '2026-03-07' },
                    { price: 950, volume: 25, recordedDate: '2026-03-06' },
                    { price: 900, volume: 20, recordedDate: '2026-03-05' },
                    { price: 875, volume: 18, recordedDate: '2026-03-04' },
                ],
            }),
            procItem: createItem(101, 'Cold Draft Beer', 5_000),
            ingredients: [
                { itemId: 9001, quantity: 5, sortOrder: 0, item: createItem(9001, 'Grain', 20) },
            ],
        };

        const rows = buildOverviewRows([recipe], 'cooking', settings, state);

        expect(rows).toHaveLength(1);
        expect(rows[0]?.dailyVolume).toBe(42);
    });

    it('uses custom byproduct prices even when the item is outside the recipe tree payload', () => {
        const settings = getDefaultCraftingSettings();
        const state = {
            ...getDefaultCalculatorState(),
            customPrices: {
                9065: 2_500,
            },
        };
        const recipe: CalculatorRecipe = {
            id: 1,
            name: 'Beer',
            type: 'cooking',
            experience: 400,
            cookTimeSeconds: 1.2,
            resultItemId: 100,
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procItemId: 101,
            procQuantity: 1,
            procMaxQuantity: 2,
            resultItem: createItem(100, 'Beer', 1_000),
            procItem: createItem(101, 'Cold Draft Beer', 5_000),
            ingredients: [
                { itemId: 9001, quantity: 5, sortOrder: 0, item: createItem(9001, 'Grain', 20) },
            ],
        };

        const tree = buildRecipeTree({
            recipes: [recipe],
            rootRecipeId: 1,
            craftQuantity: 10,
            settings,
            state,
        });

        expect(tree?.outputs.find((row) => row.kind === 'byproduct')).toMatchObject({
            itemId: 9065,
            name: 'Leite',
            unitPrice: 2_500,
            source: 'custom',
        });
    });

    it('uses min/max output ranges for alchemy recipes', () => {
        const settings = getDefaultCraftingSettings();
        const recipe: CalculatorRecipe = {
            id: 10,
            name: 'Will Elixir',
            type: 'alchemy',
            experience: 400,
            cookTimeSeconds: 1.2,
            resultItemId: 702,
            resultQuantity: 1,
            resultMaxQuantity: 4,
            procItemId: 703,
            procQuantity: 1,
            procMaxQuantity: 2,
            resultItem: createItem(702, 'Will Elixir', 10_000),
            procItem: createItem(703, 'Strong Will Elixir', 25_000),
            ingredients: [
                { itemId: 5001, quantity: 2, sortOrder: 0, item: createItem(5001, 'Material', 500) },
            ],
        };

        const rates = getRecipeRates(recipe, settings, false, true);

        expect(rates.normalProcRate).toBeCloseTo(3.01855, 5);
        expect(rates.rareProcRate).toBeCloseTo(0.3, 5);
        expect(rates.massProcRate).toBe(1);
    });
});

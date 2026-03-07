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
            resultQuantity: 2.5,
            procItemId: 101,
            procQuantity: 0.45,
            resultItem: createItem(100, 'Beer', 1_000),
            procItem: createItem(101, 'Cold Draft Beer', 5_000),
            ingredients: [
                { itemId: 9001, quantity: 5, sortOrder: 0, item: createItem(9001, 'Grain', 20) },
            ],
        };

        const rates = getRecipeRates(recipe, settings, false, true);

        expect(rates.normalProcRate).toBeCloseTo(2.58905, 5);
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
            resultQuantity: 2.5,
            procItemId: 101,
            procQuantity: 0.45,
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
        expect(tree?.outputs.find((row) => row.kind === 'normal')?.quantity).toBeCloseTo(2_589.05, 2);
        expect(tree?.outputs.find((row) => row.kind === 'rare')?.quantity).toBeCloseTo(409.33928, 3);
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
            resultQuantity: 2.5,
            procItemId: 101,
            procQuantity: 0.45,
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
            resultQuantity: 2.5,
            procItemId: 101,
            procQuantity: 0.45,
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
});


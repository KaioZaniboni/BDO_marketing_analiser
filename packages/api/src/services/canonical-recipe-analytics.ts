import type { MarketItem, RankingWeights, TaxConfig } from '../types';
import {
    analyzeProfitability,
    calculateNetMultiplier,
    matchInventory,
    rankRecipes,
} from './calculator';
import type { CanonicalReadableRecipe } from './canonical-recipe-reader';
import { getImperialBonus, IMPERIAL_RECIPES_MAPPING } from './imperial-data';

const DEFAULT_TAX_CONFIG: TaxConfig = {
    baseTaxRate: 0.35,
    hasValuePack: true,
    hasMerchantRing: false,
    familyFame: 0,
};

type SnapshotLike = {
    basePrice: bigint;
    lastSoldPrice: bigint | null;
    currentStock?: number;
    totalTrades?: bigint;
    priceMin?: bigint | null;
    priceMax?: bigint | null;
};

export function getCanonicalSnapshotPrice(snapshot: SnapshotLike | null | undefined): number {
    return Number(snapshot?.lastSoldPrice ?? snapshot?.basePrice ?? 0);
}

function toMarketItem(itemId: number, snapshot: SnapshotLike | null | undefined): MarketItem {
    return {
        id: itemId,
        minEnhance: 0,
        maxEnhance: 0,
        basePrice: Number(snapshot?.basePrice ?? 0),
        currentStock: snapshot?.currentStock ?? 0,
        totalTrades: Number(snapshot?.totalTrades ?? 0),
        priceMin: Number(snapshot?.priceMin ?? 0),
        priceMax: Number(snapshot?.priceMax ?? 0),
        lastSoldPrice: getCanonicalSnapshotPrice(snapshot),
        lastSoldTime: 0,
    };
}

export function buildCanonicalIngredientPriceMap(recipes: CanonicalReadableRecipe[]): Map<number, number> {
    const priceMap = new Map<number, number>();

    for (const recipe of recipes) {
        for (const ingredient of recipe.ingredients) {
            if (!priceMap.has(ingredient.itemId)) {
                priceMap.set(ingredient.itemId, getCanonicalSnapshotPrice(ingredient.item.prices[0]));
            }
        }
    }

    return priceMap;
}

export function analyzeCanonicalRecipeProfitability(
    recipe: CanonicalReadableRecipe,
    userInventory: Map<number, number>,
    taxConfig: TaxConfig,
    craftCount: number,
) {
    const priceMap = buildCanonicalIngredientPriceMap([recipe]);
    const match = matchInventory(
        recipe.id,
        recipe.ingredients.map((ingredient) => ({
            itemId: ingredient.itemId,
            quantity: ingredient.quantity,
        })),
        userInventory,
        priceMap,
        craftCount,
    );
    const analysis = analyzeProfitability(
        match,
        recipe.name,
        getCanonicalSnapshotPrice(recipe.resultItem.prices[0]),
        recipe.resultQuantity * craftCount,
        priceMap,
        taxConfig,
    );

    return { match, analysis };
}

export function buildCanonicalRanking(
    recipes: CanonicalReadableRecipe[],
    weights?: RankingWeights,
) {
    const priceMap = buildCanonicalIngredientPriceMap(recipes);
    const emptyInventory = new Map<number, number>();
    const marketData = new Map<number, MarketItem>(
        recipes.map((recipe) => [
            recipe.resultItemId,
            toMarketItem(recipe.resultItemId, recipe.resultItem.prices[0]),
        ]),
    );

    const recipesForRanking = recipes.map((recipe) => {
        const match = matchInventory(
            recipe.id,
            recipe.ingredients.map((ingredient) => ({
                itemId: ingredient.itemId,
                quantity: ingredient.quantity,
            })),
            emptyInventory,
            priceMap,
        );

        return {
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeType: recipe.type,
            resultItemId: recipe.resultItemId,
            dailyVolume: Number(recipe.resultItem.priceHistory?.[0]?.volume ?? 0),
            analysis: analyzeProfitability(
                match,
                recipe.name,
                getCanonicalSnapshotPrice(recipe.resultItem.prices[0]),
                recipe.resultQuantity,
                priceMap,
                DEFAULT_TAX_CONFIG,
            ),
        };
    });

    return rankRecipes(recipesForRanking, marketData, weights);
}

export function buildCanonicalImperialRanking(
    recipes: CanonicalReadableRecipe[],
    input: { mastery: number; taxConfig?: TaxConfig },
) {
    const validIds = new Set(Object.keys(IMPERIAL_RECIPES_MAPPING).map(Number));
    const uniqueMap = new Map<string, CanonicalReadableRecipe & { cost: number }>();

    for (const recipe of recipes) {
        if (!validIds.has(recipe.resultItemId)) {
            continue;
        }

        const cost = recipe.ingredients.reduce(
            (total, ingredient) => total + (ingredient.quantity * getCanonicalSnapshotPrice(ingredient.item.prices[0])),
            0,
        );
        const current = uniqueMap.get(recipe.name);
        if (!current || cost < current.cost) {
            uniqueMap.set(recipe.name, { ...recipe, cost });
        }
    }

    const taxMultiplier = calculateNetMultiplier(input.taxConfig ?? DEFAULT_TAX_CONFIG);
    const masteryBonusPct = getImperialBonus(input.mastery) / 100;

    return Array.from(uniqueMap.values())
        .map((recipe) => {
            const boxInfo = IMPERIAL_RECIPES_MAPPING[recipe.resultItemId];
            const baseItemPrice = getCanonicalSnapshotPrice(recipe.resultItem.prices[0]);
            const dailyVolume = Number(recipe.resultItem.priceHistory?.[0]?.volume ?? 0);
            const baseBoxNPCPrice = boxInfo.tier.basePrice * 2.5;
            const imperialBoxPrice = baseBoxNPCPrice + (baseBoxNPCPrice * masteryBonusPct);
            const costPerBox = recipe.cost * boxInfo.qtyRequired;

            return {
                id: recipe.id,
                name: recipe.name,
                resultItemId: recipe.resultItemId,
                baseItemPrice,
                boxInfo,
                costPerBox,
                imperialBoxPrice: Math.floor(imperialBoxPrice),
                profitPerBox: Math.floor(imperialBoxPrice - costPerBox),
                marketRevenuePerBox: Math.floor((baseItemPrice * boxInfo.qtyRequired) * taxMultiplier),
                dailyVolume,
            };
        })
        .sort((left, right) => right.profitPerBox - left.profitPerBox);
}
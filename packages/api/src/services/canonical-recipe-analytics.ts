import type {
    ImperialIngredientPerBox,
    ImperialInventoryCoverageRow,
    ImperialRankingRow,
    ImperialType,
    MarketItem,
    RankingWeights,
    TaxConfig,
} from '../types';
import {
    analyzeProfitability,
    calculateNetMultiplier,
    matchInventory,
    rankRecipes,
} from './calculator';
import type { CanonicalReadableRecipe } from './canonical-recipe-reader';
import { getCraftingItemUnitPrice } from './crafting-price-data';
import { getImperialRecipeEntry } from './imperial-data';
import { getExpectedImperialOutputPerCraft, getImperialBonus } from './imperial-mastery';

const DEFAULT_TAX_CONFIG: TaxConfig = {
    baseTaxRate: 0.35,
    hasValuePack: true,
    hasMerchantRing: false,
    familyFame: 0,
};

const DEFAULT_COOKING_ACTION_SECONDS = 1.2;
const DEFAULT_ALCHEMY_ACTION_SECONDS = 1.2;

type SnapshotLike = {
    basePrice: bigint;
    lastSoldPrice: bigint | null;
    currentStock?: number;
    totalTrades?: bigint;
    priceMin?: bigint | null;
    priceMax?: bigint | null;
};

export type ImperialRankingInput = {
    mastery: number;
    taxConfig?: TaxConfig;
    cookingTimeSeconds?: number;
    alchemyTimeSeconds?: number;
};

function toNumber(value: bigint | number | null | undefined): number {
    if (typeof value === 'bigint') {
        return Number(value);
    }

    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

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

function getImperialCoverageKey(recipeId: number, targetItemId: number): string {
    return `${recipeId}:${targetItemId}`;
}

function getRecipeActionSeconds(recipe: CanonicalReadableRecipe, input: ImperialRankingInput): number {
    if (recipe.type === 'alchemy') {
        return Math.max(input.alchemyTimeSeconds ?? recipe.cookTimeSeconds ?? DEFAULT_ALCHEMY_ACTION_SECONDS, 0.1);
    }

    return Math.max(input.cookingTimeSeconds ?? recipe.cookTimeSeconds ?? DEFAULT_COOKING_ACTION_SECONDS, 0.1);
}

function getTargetItem(
    recipe: CanonicalReadableRecipe,
    outputKind: 'result' | 'proc',
) {
    return outputKind === 'result' ? recipe.resultItem : recipe.procItem;
}

function getTargetResultQuantity(
    recipe: CanonicalReadableRecipe,
    outputKind: 'result' | 'proc',
): number {
    return outputKind === 'result'
        ? recipe.resultQuantity
        : Math.max(recipe.procQuantity ?? 0, 0);
}

function getTargetDailyVolume(
    recipe: CanonicalReadableRecipe,
    outputKind: 'result' | 'proc',
): number {
    const targetItem = getTargetItem(recipe, outputKind);
    return toNumber(targetItem?.priceHistory?.[0]?.volume ?? 0);
}

function aggregateIngredientsPerBox(rows: ImperialIngredientPerBox[]): ImperialIngredientPerBox[] {
    const aggregated = new Map<number, ImperialIngredientPerBox>();

    for (const row of rows) {
        const current = aggregated.get(row.itemId);
        if (!current) {
            aggregated.set(row.itemId, { ...row });
            continue;
        }

        current.quantity += row.quantity;
        current.totalCost += row.totalCost;
    }

    return Array.from(aggregated.values()).sort((left, right) => right.totalCost - left.totalCost);
}

function buildIngredientsPerBox(
    recipe: CanonicalReadableRecipe,
    craftsPerBox: number,
): ImperialIngredientPerBox[] {
    return aggregateIngredientsPerBox(
        recipe.ingredients.map((ingredient) => {
            const price = getCraftingItemUnitPrice(ingredient.itemId, ingredient.item.prices[0]);
            const quantity = ingredient.quantity * craftsPerBox;

            return {
                itemId: ingredient.itemId,
                name: ingredient.item.name,
                quantity,
                unitPrice: price.unitPrice,
                totalCost: quantity * price.unitPrice,
                source: price.source,
                iconUrl: ingredient.item.iconUrl,
                grade: ingredient.item.grade,
            };
        }),
    );
}

function buildImperialRowForOutput(
    recipe: CanonicalReadableRecipe,
    outputKind: 'result' | 'proc',
    input: ImperialRankingInput,
    taxMultiplier: number,
): ImperialRankingRow | null {
    const targetItem = getTargetItem(recipe, outputKind);
    const targetItemId = outputKind === 'result' ? recipe.resultItemId : recipe.procItemId;
    const boxInfo = getImperialRecipeEntry(targetItemId);

    if (!targetItem || !targetItemId || !boxInfo || boxInfo.type !== recipe.type) {
        return null;
    }

    const { expectedOutputPerCraft, massProcRate } = getExpectedImperialOutputPerCraft(recipe, targetItemId, input.mastery);
    if (expectedOutputPerCraft <= 0) {
        return null;
    }

    const masteryBonusPct = getImperialBonus(input.mastery) / 100;
    const craftsPerBox = boxInfo.qtyRequired / expectedOutputPerCraft;
    const ingredientsPerBox = buildIngredientsPerBox(recipe, craftsPerBox);
    const costPerCraftRaw = recipe.ingredients.reduce((total, ingredient) => {
        const price = getCraftingItemUnitPrice(ingredient.itemId, ingredient.item.prices[0]);
        return total + (ingredient.quantity * price.unitPrice);
    }, 0);
    const costPerBoxProducedRaw = ingredientsPerBox.reduce((total, ingredient) => total + ingredient.totalCost, 0);
    const actionSeconds = getRecipeActionSeconds(recipe, input);
    const effectiveActionSeconds = actionSeconds / Math.max(massProcRate, 1);

    const baseBoxNpcPrice = boxInfo.tier.basePrice * 2.5;
    const imperialSalePrice = Math.floor(baseBoxNpcPrice * (1 + masteryBonusPct));
    const marketUnitPrice = getCanonicalSnapshotPrice(targetItem.prices[0]);
    const hasMarketPrice = marketUnitPrice > 0;
    const marketPurchaseCostPerBox = hasMarketPrice ? Math.round(boxInfo.qtyRequired * marketUnitPrice) : null;
    const marketSaleRevenuePerBox = hasMarketPrice
        ? Math.floor(boxInfo.qtyRequired * marketUnitPrice * taxMultiplier)
        : null;
    const profitImperialBuying = marketPurchaseCostPerBox == null
        ? null
        : imperialSalePrice - marketPurchaseCostPerBox;
    const costPerBoxProduced = Math.round(costPerBoxProducedRaw);
    const profitImperialProducing = imperialSalePrice - costPerBoxProduced;
    const profitMarketProducing = marketSaleRevenuePerBox == null
        ? null
        : marketSaleRevenuePerBox - costPerBoxProduced;

    return {
        coverageKey: getImperialCoverageKey(recipe.id, targetItemId),
        id: recipe.id,
        name: recipe.name,
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeType: recipe.type as ImperialType,
        resultItemId: targetItemId,
        targetItemId,
        targetItemName: targetItem.name,
        targetIconUrl: targetItem.iconUrl,
        targetGrade: targetItem.grade,
        targetOutputKind: outputKind,
        tierKey: boxInfo.tierKey,
        tierName: boxInfo.tier.name,
        tierSortOrder: boxInfo.tier.sortOrder,
        qtyRequired: boxInfo.qtyRequired,
        boxName: boxInfo.boxName,
        boxInfo: {
            tier: boxInfo.tier,
            qtyRequired: boxInfo.qtyRequired,
            boxName: boxInfo.boxName,
        },
        masteryBonusPct,
        baseBoxNpcPrice,
        imperialBoxPrice: imperialSalePrice,
        imperialSalePrice,
        marketUnitPrice,
        marketPurchaseCostPerBox,
        marketRevenuePerBox: marketSaleRevenuePerBox,
        marketSaleRevenuePerBox,
        costPerCraft: Math.round(costPerCraftRaw),
        costPerBox: costPerBoxProduced,
        costPerBoxProduced,
        profitImperialBuying,
        profitPerBox: profitImperialProducing,
        profitImperialProducing,
        profitMarketProducing,
        imperialRoi: costPerBoxProducedRaw > 0
            ? profitImperialProducing / costPerBoxProducedRaw
            : 0,
        currentStock: Number(targetItem.prices[0]?.currentStock ?? 0),
        dailyVolume: getTargetDailyVolume(recipe, outputKind),
        expectedOutputPerCraft,
        resultQuantity: getTargetResultQuantity(recipe, outputKind),
        craftsPerBox,
        craftSecondsPerBox: craftsPerBox * effectiveActionSeconds,
        actionSeconds,
        massProcRate,
        bestSaleChannel: profitMarketProducing != null && profitMarketProducing > profitImperialProducing
            ? 'market'
            : 'imperial',
        bestImperialAcquisition: profitImperialBuying != null && profitImperialBuying > profitImperialProducing
            ? 'buy'
            : 'produce',
        ingredientsPerBox,
    };
}

export function buildCanonicalImperialRanking(
    recipes: CanonicalReadableRecipe[],
    input: ImperialRankingInput,
): ImperialRankingRow[] {
    const taxMultiplier = calculateNetMultiplier(input.taxConfig ?? DEFAULT_TAX_CONFIG);
    const bestByTargetItem = new Map<number, ImperialRankingRow>();

    for (const recipe of recipes) {
        const rows = [
            buildImperialRowForOutput(recipe, 'result', input, taxMultiplier),
            buildImperialRowForOutput(recipe, 'proc', input, taxMultiplier),
        ].filter(Boolean) as ImperialRankingRow[];

        for (const row of rows) {
            const current = bestByTargetItem.get(row.targetItemId);
            if (!current) {
                bestByTargetItem.set(row.targetItemId, row);
                continue;
            }

            if (row.costPerBoxProduced < current.costPerBoxProduced) {
                bestByTargetItem.set(row.targetItemId, row);
                continue;
            }

            if (
                row.costPerBoxProduced === current.costPerBoxProduced
                && row.profitImperialProducing > current.profitImperialProducing
            ) {
                bestByTargetItem.set(row.targetItemId, row);
            }
        }
    }

    return Array.from(bestByTargetItem.values()).sort((left, right) => (
        right.profitImperialProducing - left.profitImperialProducing
        || right.imperialRoi - left.imperialRoi
        || right.dailyVolume - left.dailyVolume
        || left.tierSortOrder - right.tierSortOrder
        || left.targetItemName.localeCompare(right.targetItemName)
    ));
}

export function buildCanonicalImperialInventoryCoverage(
    ranking: ImperialRankingRow[],
    userInventory: Map<number, number>,
): ImperialInventoryCoverageRow[] {
    return ranking.map((row) => {
        let maxBoxesFromInventory = Number.POSITIVE_INFINITY;
        let coverageRatio = 1;

        const missingIngredients = row.ingredientsPerBox
            .map((ingredient) => {
                const ownedQuantity = userInventory.get(ingredient.itemId) ?? 0;
                const requiredQuantity = ingredient.quantity;
                const boxRatio = requiredQuantity > 0 ? ownedQuantity / requiredQuantity : 0;

                maxBoxesFromInventory = Math.min(maxBoxesFromInventory, boxRatio);
                coverageRatio = Math.min(coverageRatio, boxRatio);

                const missingQuantity = Math.max(requiredQuantity - ownedQuantity, 0);
                if (missingQuantity <= 0) {
                    return null;
                }

                return {
                    itemId: ingredient.itemId,
                    name: ingredient.name,
                    iconUrl: ingredient.iconUrl,
                    grade: ingredient.grade,
                    unitPrice: ingredient.unitPrice,
                    ownedQuantity,
                    requiredQuantity,
                    missingQuantity,
                    totalCost: missingQuantity * ingredient.unitPrice,
                };
            })
            .filter((ingredient): ingredient is NonNullable<typeof ingredient> => ingredient !== null);

        return {
            coverageKey: row.coverageKey,
            recipeId: row.recipeId,
            targetItemId: row.targetItemId,
            maxBoxesFromInventory: Number.isFinite(maxBoxesFromInventory) ? Math.max(Math.floor(maxBoxesFromInventory), 0) : 0,
            inventoryCoveragePct: Math.max(0, Math.min(coverageRatio, 1)) * 100,
            missingIngredients,
        };
    });
}

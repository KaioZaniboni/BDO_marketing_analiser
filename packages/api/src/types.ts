/**
 * Configuração de taxas do mercado para o servidor SA.
 */
export interface TaxConfig {
    /** Taxa base do mercado (0.35 para SA) */
    baseTaxRate: number;
    /** Se possui Value Pack ativo */
    hasValuePack: boolean;
    /** Se possui Anel de Mercador (Pearl) */
    hasMerchantRing: boolean;
    /** Fama de Família (0 a ~2000+) */
    familyFame: number;
}

/**
 * Resultado do match de inventário para uma receita.
 */
export interface InventoryMatch {
    recipeId: number;
    maxCraftable: number;
    ownedIngredients: {
        itemId: number;
        required: number;
        owned: number;
        covered: number;
    }[];
    missingIngredients: {
        itemId: number;
        missingQty: number;
        unitPrice: number;
        totalCost: number;
    }[];
    coveragePercent: number;
    totalMissingCost: number;
}

/**
 * Resultado da análise de lucratividade.
 */
export interface ProfitAnalysis {
    recipeId: number;
    recipeName: string;
    sellRawProfit: number;
    craftProfit: number;
    opportunityCost: number;
    recommendation: 'CRAFT' | 'SELL_RAW' | 'BREAK_EVEN';
    missingItemsCost: number;
    netProfitAfterBuying: number;
}

/**
 * Receita rankeada com métricas compostas.
 */
export interface RankedRecipe {
    recipeId: number;
    recipeName: string;
    recipeType: string;
    resultItemId: number;
    roi: number;
    liquidityScore: number;
    grossProfit: number;
    compositeScore: number;
    rank: number;
}

/**
 * Pesos configuráveis para o algoritmo de ranking.
 */
export interface RankingWeights {
    roi: number;
    liquidity: number;
    profit: number;
}

/**
 * Item do mercado parseado da API.
 */
export interface MarketItem {
    id: number;
    minEnhance: number;
    maxEnhance: number;
    basePrice: number;
    currentStock: number;
    totalTrades: number;
    priceMin: number;
    priceMax: number;
    lastSoldPrice: number;
    lastSoldTime: number;
}

export type ImperialType = 'cooking' | 'alchemy';
export type ImperialTierKey = 'APPRENTICE' | 'SKILLED' | 'PROFESSIONAL' | 'ARTISAN' | 'MASTER' | 'GURU';
export type ImperialBestSaleChannel = 'imperial' | 'market';
export type ImperialBestAcquisition = 'buy' | 'produce';
export type ImperialIngredientPriceSource = 'market' | 'vendor' | 'missing';
export type ImperialOutputKind = 'result' | 'proc';

export interface ImperialTier {
    key: ImperialTierKey;
    name: string;
    basePrice: number;
    sortOrder: number;
}

export interface ImperialRecipeMappingEntry {
    resultItemId: number;
    type: ImperialType;
    tierKey: ImperialTierKey;
    tier: ImperialTier;
    qtyRequired: number;
    boxName: string;
}

export interface ImperialIngredientPerBox {
    itemId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    source: ImperialIngredientPriceSource;
    iconUrl: string | null;
    grade: number | null;
}

export interface ImperialRankingRow {
    coverageKey: string;
    id: number;
    name: string;
    recipeId: number;
    recipeName: string;
    recipeType: ImperialType;
    resultItemId: number;
    targetItemId: number;
    targetItemName: string;
    targetIconUrl: string | null;
    targetGrade: number | null;
    targetOutputKind: ImperialOutputKind;
    tierKey: ImperialTierKey;
    tierName: string;
    tierSortOrder: number;
    qtyRequired: number;
    boxName: string;
    boxInfo: {
        tier: ImperialTier;
        qtyRequired: number;
        boxName: string;
    };
    masteryBonusPct: number;
    baseBoxNpcPrice: number;
    imperialBoxPrice: number;
    imperialSalePrice: number;
    marketUnitPrice: number;
    marketPurchaseCostPerBox: number | null;
    marketRevenuePerBox: number | null;
    marketSaleRevenuePerBox: number | null;
    costPerCraft: number;
    costPerBox: number;
    costPerBoxProduced: number;
    profitImperialBuying: number | null;
    profitPerBox: number;
    profitImperialProducing: number;
    profitMarketProducing: number | null;
    imperialRoi: number;
    currentStock: number;
    dailyVolume: number;
    expectedOutputPerCraft: number;
    resultQuantity: number;
    craftsPerBox: number;
    craftSecondsPerBox: number;
    actionSeconds: number;
    massProcRate: number;
    bestSaleChannel: ImperialBestSaleChannel;
    bestImperialAcquisition: ImperialBestAcquisition;
    ingredientsPerBox: ImperialIngredientPerBox[];
}

export interface ImperialMissingIngredient {
    itemId: number;
    name: string;
    iconUrl: string | null;
    grade: number | null;
    unitPrice: number;
    ownedQuantity: number;
    requiredQuantity: number;
    missingQuantity: number;
    totalCost: number;
}

export interface ImperialInventoryCoverageRow {
    coverageKey: string;
    recipeId: number;
    targetItemId: number;
    maxBoxesFromInventory: number;
    inventoryCoveragePct: number;
    missingIngredients: ImperialMissingIngredient[];
}

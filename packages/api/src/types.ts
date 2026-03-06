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

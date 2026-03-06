import type {
    TaxConfig,
    InventoryMatch,
    ProfitAnalysis,
    RankedRecipe,
    RankingWeights,
    MarketItem,
} from '../types';

// ============================================================
// Cálculo de Taxas do Servidor SA
// ============================================================

const DEFAULT_BASE_TAX_RATE = 0.35;
const VALUE_PACK_DISCOUNT = 0.30;
const MERCHANT_RING_DISCOUNT = 0.05;
const MAX_FAME_DISCOUNT = 0.005;
const FAME_DIVISOR = 400_000;

/**
 * Calcula o multiplicador de receita líquida do mercado SA.
 *
 * Taxa final = base - VP - anel - fama
 * Retorna o multiplicador (ex: 0.805 = jogador recebe 80.5%)
 */
export function calculateNetMultiplier(config: TaxConfig): number {
    let taxRate = config.baseTaxRate ?? DEFAULT_BASE_TAX_RATE;

    // Value Pack: reduz a taxa em 30%
    if (config.hasValuePack) {
        taxRate *= 1 - VALUE_PACK_DISCOUNT;
    }

    // Anel de Mercador: -5% absoluto
    if (config.hasMerchantRing) {
        taxRate -= MERCHANT_RING_DISCOUNT;
    }

    // Fama de Família: até -0.5%
    const fameDiscount = Math.min(config.familyFame / FAME_DIVISOR, MAX_FAME_DISCOUNT);
    taxRate -= fameDiscount;

    taxRate = Math.max(taxRate, 0);

    return 1 - taxRate;
}

// ============================================================
// Match de Inventário + Missing Items
// ============================================================

interface IngredientInput {
    itemId: number;
    quantity: number;
}

/**
 * Compara os ingredientes de uma receita com o inventário do usuário.
 * Retorna quais itens o usuário possui, quais faltam e o custo para comprar.
 */
export function matchInventory(
    recipeId: number,
    ingredients: IngredientInput[],
    userInventory: Map<number, number>,
    marketPrices: Map<number, number>,
    craftCount: number = 1,
): InventoryMatch {
    let minCraftable = Infinity;
    const owned: InventoryMatch['ownedIngredients'] = [];
    const missing: InventoryMatch['missingIngredients'] = [];
    let totalMissingCost = 0;
    let totalRequired = 0;
    let totalCovered = 0;

    for (const ing of ingredients) {
        const requiredTotal = ing.quantity * craftCount;
        const ownedQty = userInventory.get(ing.itemId) ?? 0;
        const covered = Math.min(ownedQty, requiredTotal);

        const craftsFromThis = Math.floor(ownedQty / ing.quantity);
        minCraftable = Math.min(minCraftable, craftsFromThis);

        owned.push({
            itemId: ing.itemId,
            required: requiredTotal,
            owned: ownedQty,
            covered,
        });

        totalRequired += requiredTotal;
        totalCovered += covered;

        const missingQty = requiredTotal - covered;
        if (missingQty > 0) {
            const unitPrice = marketPrices.get(ing.itemId) ?? 0;
            const cost = missingQty * unitPrice;
            totalMissingCost += cost;
            missing.push({
                itemId: ing.itemId,
                missingQty,
                unitPrice,
                totalCost: cost,
            });
        }
    }

    return {
        recipeId,
        maxCraftable: minCraftable === Infinity ? 0 : minCraftable,
        ownedIngredients: owned,
        missingIngredients: missing,
        coveragePercent: totalRequired > 0
            ? Math.round((totalCovered / totalRequired) * 10000) / 100
            : 0,
        totalMissingCost,
    };
}

// ============================================================
// Análise de Lucratividade (Custo de Oportunidade)
// ============================================================

const OPPORTUNITY_THRESHOLD = 1000; // silver

/**
 * Analisa se vale mais a pena craftar a receita ou vender os ingredientes brutos.
 */
export function analyzeProfitability(
    match: InventoryMatch,
    recipeName: string,
    resultPrice: number,
    resultQuantity: number,
    ingredientPrices: Map<number, number>,
    taxConfig: TaxConfig,
): ProfitAnalysis {
    const netMultiplier = calculateNetMultiplier(taxConfig);

    // Cenário A: Vender ingredientes brutos
    let sellRawProfit = 0;
    for (const ing of match.ownedIngredients) {
        const marketPrice = ingredientPrices.get(ing.itemId) ?? 0;
        sellRawProfit += ing.covered * marketPrice * netMultiplier;
    }
    sellRawProfit = Math.floor(sellRawProfit);

    // Cenário B: Craftar a receita
    const craftRevenue = Math.floor(resultPrice * resultQuantity * netMultiplier);
    const craftProfit = craftRevenue - match.totalMissingCost;

    // Custo de Oportunidade: craftar - vender bruto
    const opportunityCost = craftProfit - sellRawProfit;

    // Lucro líquido se comprar os itens faltantes
    const netProfitAfterBuying = craftRevenue - match.totalMissingCost - sellRawProfit;

    let recommendation: ProfitAnalysis['recommendation'];
    if (opportunityCost > OPPORTUNITY_THRESHOLD) {
        recommendation = 'CRAFT';
    } else if (opportunityCost < -OPPORTUNITY_THRESHOLD) {
        recommendation = 'SELL_RAW';
    } else {
        recommendation = 'BREAK_EVEN';
    }

    return {
        recipeId: match.recipeId,
        recipeName,
        sellRawProfit,
        craftProfit,
        opportunityCost,
        recommendation,
        missingItemsCost: match.totalMissingCost,
        netProfitAfterBuying,
    };
}

// ============================================================
// Algoritmo de Rankeamento
// ============================================================

const DEFAULT_WEIGHTS: RankingWeights = {
    roi: 0.40,
    liquidity: 0.35,
    profit: 0.25,
};

/**
 * Normaliza um array de valores para a escala 0-100 (min-max scaling).
 */
function normalize(values: number[]): number[] {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((v) => ((v - min) / range) * 100);
}

interface RecipeForRanking {
    recipeId: number;
    recipeName: string;
    recipeType: string;
    resultItemId: number;
    analysis: ProfitAnalysis;
}

/**
 * Rankeia receitas por score composto considerando ROI, Liquidez e Lucro Bruto.
 */
export function rankRecipes(
    recipes: RecipeForRanking[],
    marketData: Map<number, MarketItem>,
    weights: RankingWeights = DEFAULT_WEIGHTS,
): RankedRecipe[] {
    // 1. Calcular métricas brutas
    const rawMetrics = recipes.map((r) => {
        const resultItem = marketData.get(r.resultItemId);
        const sellRaw = Math.abs(r.analysis.sellRawProfit) || 1;
        const totalCost = r.analysis.missingItemsCost + sellRaw;
        const roi = totalCost > 0
            ? ((r.analysis.craftProfit - totalCost) / totalCost) * 100
            : 0;

        // Liquidez: volume diário / estoque
        const dailyVolume = Number(resultItem?.totalTrades ?? 0);
        const stock = resultItem?.currentStock ?? 1;
        const liquidityRaw = stock > 0 ? dailyVolume / stock : dailyVolume * 2;

        return {
            recipeId: r.recipeId,
            recipeName: r.recipeName,
            recipeType: r.recipeType,
            resultItemId: r.resultItemId,
            roi,
            liquidityRaw,
            grossProfit: r.analysis.craftProfit,
        };
    });

    if (rawMetrics.length === 0) return [];

    // 2. Normalizar
    const roiNorm = normalize(rawMetrics.map((m) => m.roi));
    const liqNorm = normalize(rawMetrics.map((m) => m.liquidityRaw));
    const profNorm = normalize(rawMetrics.map((m) => m.grossProfit));

    // 3. Calcular score composto
    const ranked: RankedRecipe[] = rawMetrics.map((m, i) => ({
        recipeId: m.recipeId,
        recipeName: m.recipeName,
        recipeType: m.recipeType,
        resultItemId: m.resultItemId,
        roi: Math.round(m.roi * 100) / 100,
        liquidityScore: Math.round(liqNorm[i] * 100) / 100,
        grossProfit: m.grossProfit,
        compositeScore: Math.round(
            (weights.roi * roiNorm[i] +
                weights.liquidity * liqNorm[i] +
                weights.profit * profNorm[i]) * 100,
        ) / 100,
        rank: 0,
    }));

    // 4. Ordenar por score composto descendente
    ranked.sort((a, b) => b.compositeScore - a.compositeScore);
    ranked.forEach((r, i) => {
        r.rank = i + 1;
    });

    return ranked;
}

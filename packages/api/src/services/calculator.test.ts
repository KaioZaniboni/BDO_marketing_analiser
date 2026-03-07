import { describe, expect, it } from 'vitest';
import { rankRecipes } from './calculator';

describe('rankRecipes', () => {
    it('uses historical daily volume instead of totalTrades for liquidity', () => {
        const recipes = [
            {
                recipeId: 1,
                recipeName: 'Low Daily, High Total Trades',
                recipeType: 'cooking',
                resultItemId: 100,
                dailyVolume: 5,
                analysis: {
                    recipeId: 1,
                    recipeName: 'Low Daily, High Total Trades',
                    sellRawProfit: 1_000,
                    craftProfit: 10_000,
                    opportunityCost: 9_000,
                    recommendation: 'CRAFT' as const,
                    missingItemsCost: 0,
                    netProfitAfterBuying: 9_000,
                },
            },
            {
                recipeId: 2,
                recipeName: 'High Daily, Low Total Trades',
                recipeType: 'cooking',
                resultItemId: 200,
                dailyVolume: 60,
                analysis: {
                    recipeId: 2,
                    recipeName: 'High Daily, Low Total Trades',
                    sellRawProfit: 1_000,
                    craftProfit: 10_000,
                    opportunityCost: 9_000,
                    recommendation: 'CRAFT' as const,
                    missingItemsCost: 0,
                    netProfitAfterBuying: 9_000,
                },
            },
        ];

        const marketData = new Map([
            [100, { id: 100, minEnhance: 0, maxEnhance: 0, basePrice: 1000, currentStock: 10, totalTrades: 999999, priceMin: 0, priceMax: 0, lastSoldPrice: 1000, lastSoldTime: 0 }],
            [200, { id: 200, minEnhance: 0, maxEnhance: 0, basePrice: 1000, currentStock: 10, totalTrades: 1, priceMin: 0, priceMax: 0, lastSoldPrice: 1000, lastSoldTime: 0 }],
        ]);

        const ranked = rankRecipes(recipes, marketData, {
            roi: 0,
            liquidity: 1,
            profit: 0,
        });

        expect(ranked[0]?.recipeId).toBe(2);
        expect(ranked[1]?.recipeId).toBe(1);
    });
});
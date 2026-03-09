import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LeafInputRow, RecipeTreeNode } from '@/lib/crafting/calculator';
import { OverviewPanel } from './CraftingRecipeOverviewPanel';

const marketInput: LeafInputRow = {
    itemId: 1,
    name: 'Shrimp',
    quantity: 1709.86,
    unitPrice: 18700,
    totalCost: 31974466,
    taxed: false,
    source: 'market',
    totalTrades: 9876,
    currentStock: 5,
    iconUrl: null,
    grade: null,
    weightPerUnit: 0.01,
};

const emptyTree: RecipeTreeNode = {
    key: 'recipe-root',
    recipeId: 607,
    itemId: 1000,
    parentRecipeId: null,
    name: 'Margoria Meal',
    type: 'recipe',
    craftingType: 'cooking',
    quantityPerCraft: 1,
    requestedQuantity: 1000,
    craftQuantity: 1000,
    normalProcQuantity: 3509.1,
    rareProcQuantity: 0,
    totalTime: 120,
    individualTime: 0.12,
    craftingCost: 100000,
    totalRevenue: 200000,
    craftingProfit: 100000,
    profitPerHour: 3000000,
    displayedProfitPerHour: 3000000,
    outputs: [],
    children: [],
    leftover: [],
    ingredientAlternatives: {},
};

describe('OverviewPanel', () => {
    it('renderiza a origem compacta em duas linhas logicas', () => {
        const html = renderToStaticMarkup(
            <OverviewPanel
                leafInputs={[marketInput]}
                customPrices={{}}
                taxedItemIds={[]}
                keptItemIds={[]}
                tree={emptyTree}
                onToggleTaxedItem={vi.fn()}
                onToggleKeptItem={vi.fn()}
                onSetCustomPrice={vi.fn()}
            />,
        );

        expect(html).toContain('xl:table-fixed');
        expect(html).toContain('w-[7.25rem]');
        expect(html).toContain('line-clamp-2');
        expect(html).toContain('Mercado atual.');
        expect(html).toContain('Estoque: 5');
        expect(html).toContain('Trades: 9.876');
    });
});

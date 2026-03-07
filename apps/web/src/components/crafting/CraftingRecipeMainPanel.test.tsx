import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { RecipeTreeNode } from '@/lib/crafting/calculator';
import { CraftingRecipeMainPanel } from './CraftingRecipeMainPanel';

const recipeTree: RecipeTreeNode = {
    key: 'recipe-101',
    recipeId: 101,
    itemId: 201,
    parentRecipeId: null,
    name: 'Test Meal',
    type: 'recipe',
    craftingType: 'cooking',
    quantityPerCraft: 1,
    requestedQuantity: 100,
    craftQuantity: 100,
    normalProcQuantity: 1,
    rareProcQuantity: 0,
    totalTime: 120,
    individualTime: 120,
    craftingCost: 5000,
    totalRevenue: 8000,
    craftingProfit: 3000,
    profitPerHour: 90000,
    displayedProfitPerHour: 90000,
    outputs: [{
        kind: 'normal',
        itemId: 201,
        name: 'Output Elixir',
        quantity: 1,
        unitPrice: 8000,
        totalRevenue: 8000,
        kept: false,
        source: 'market',
        totalTrades: 0,
        currentStock: 0,
    }],
    children: [],
    leftover: [],
    ingredientAlternatives: {},
};

const detailContentProps: ComponentProps<typeof CraftingRecipeMainPanel>['detailContentProps'] = {
    leafInputs: [],
    customPrices: {},
    taxedItemIds: [],
    keptItemIds: [],
    tree: recipeTree,
    weightSummary: {
        availableWeight: 1000,
        totalWeight: 0,
        weightPerCraft: 0,
        maxCrafts: 0,
    },
    historyData: [],
    profitChartData: [],
    onToggleTaxedItem: vi.fn(),
    onToggleKeptItem: vi.fn(),
    onSetCustomPrice: vi.fn(),
};

describe('CraftingRecipeMainPanel', () => {
    it('renderiza tabs, conteúdo e summary do detalhe', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeMainPanel
                activeTab="outputs"
                onActiveTabChange={vi.fn()}
                detailContentProps={detailContentProps}
            />,
        );

        expect(html).toContain('data-tab="outputs"');
        expect(html).toContain('>Outputs<');
        expect(html).toContain('>Output Elixir<');
        expect(html).toContain('>Cost<');
        expect(html).toContain('>Profit / H<');
    });
});
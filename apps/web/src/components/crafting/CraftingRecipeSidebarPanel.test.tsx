import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { RecipeTreeNode } from '@/lib/crafting/calculator';
import { CraftingRecipeSidebarPanel } from './CraftingRecipeSidebarPanel';

const recipeTree: RecipeTreeNode = {
    key: 'recipe-607',
    recipeId: 607,
    itemId: 9202,
    parentRecipeId: null,
    name: 'Legumes em Conserva',
    type: 'recipe',
    craftingType: 'cooking',
    quantityPerCraft: 1,
    requestedQuantity: 1000,
    craftQuantity: 1000,
    normalProcQuantity: 2767,
    rareProcQuantity: 409,
    totalTime: 720,
    individualTime: 0.72,
    craftingCost: 11997178,
    totalRevenue: 23657262,
    craftingProfit: 11660084,
    profitPerHour: 58060344,
    displayedProfitPerHour: 58060344,
    outputs: [{
        kind: 'normal',
        itemId: 9202,
        name: 'Legumes em Conserva',
        quantity: 2767,
        unitPrice: 3330,
        totalRevenue: 9214110,
        kept: false,
        source: 'market',
        totalTrades: 100,
        currentStock: 10,
    }],
    children: [],
    leftover: [],
    ingredientAlternatives: {},
};

describe('CraftingRecipeSidebarPanel', () => {
    it('renderiza os KPIs principais e a árvore por padrão', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeSidebarPanel
                tree={recipeTree}
                recipeType="cooking"
                showSettings={false}
                node={recipeTree}
                onToggleCollapse={vi.fn()}
                onToggleRareProc={vi.fn()}
                onToggleSlowCook={vi.fn()}
                onSelectMaterial={vi.fn()}
                collapsedIds={[]}
                useRareProcIds={[]}
                slowCookedIds={[]}
            />,
        );

        expect(html).toContain('Resumo do lote');
        expect(html).toContain('Indicadores principais');
        expect(html).toContain('Lucro / h');
        expect(html).toContain('Receita bruta');
        expect(html).toContain('Árvore de produção');
    });
});

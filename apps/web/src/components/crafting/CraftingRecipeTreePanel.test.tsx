import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { IngredientAlternative, RecipeTreeNode } from '@/lib/crafting/calculator';
import { CraftingRecipeTreePanel } from './CraftingRecipeTreePanel';

function createOutput(itemId: number, name: string) {
    return {
        itemId,
        name,
        quantity: 1,
        unitPrice: 1000,
        totalRevenue: 1000,
        kept: false,
        source: 'market' as const,
        kind: 'normal' as const,
        totalTrades: 0,
        currentStock: 0,
        grade: null,
    };
}

function createAlternative(itemId: number, name: string, subRecipeId: number | null): IngredientAlternative {
    return {
        itemId,
        quantity: 2,
        item: {
            id: itemId,
            name,
            marketPrice: 0,
            vendorPrice: 0,
            weight: 0,
            iconImage: null,
            grade: null,
            expiresAt: null,
        },
        subRecipeId,
        subRecipeType: subRecipeId ? 'cooking' : null,
    };
}

const materialNode: RecipeTreeNode = {
    key: 'material-1',
    recipeId: null,
    itemId: 1,
    parentRecipeId: 100,
    name: 'Sugar',
    type: 'material',
    craftingType: null,
    quantityPerCraft: 1,
    requestedQuantity: 42.5,
    craftQuantity: 0,
    normalProcQuantity: 0,
    rareProcQuantity: 0,
    totalTime: 0,
    individualTime: 0,
    craftingCost: 12345,
    totalRevenue: 0,
    craftingProfit: 0,
    profitPerHour: 0,
    displayedProfitPerHour: 0,
    outputs: [],
    children: [],
    leftover: [],
    ingredientAlternatives: {},
    unitPrice: 150,
    priceSource: 'vendor',
    isTradeable: false,
};

const nestedTreeNode: RecipeTreeNode = {
    key: 'recipe-root',
    recipeId: 100,
    itemId: 1000,
    parentRecipeId: null,
    name: 'Margoria Feast',
    type: 'recipe',
    craftingType: 'cooking',
    quantityPerCraft: 1,
    requestedQuantity: 100,
    craftQuantity: 100,
    normalProcQuantity: 250,
    rareProcQuantity: 25,
    totalTime: 90,
    individualTime: 0.9,
    craftingCost: 100000,
    totalRevenue: 180000,
    craftingProfit: 80000,
    profitPerHour: 3200000,
    displayedProfitPerHour: 3200000,
    outputs: [createOutput(1000, 'Margoria Feast')],
    leftover: [],
    ingredientAlternatives: {
        0: [
            createAlternative(2000, 'Seafood Sauce', 200),
            createAlternative(2100, 'Butter Lobster', 210),
        ],
    },
    children: [
        {
            key: 'recipe-sub',
            recipeId: 200,
            itemId: 2000,
            parentRecipeId: 100,
            name: 'Seafood Sauce',
            type: 'recipe',
            craftingType: 'cooking',
            quantityPerCraft: 1,
            requestedQuantity: 60,
            craftQuantity: 60,
            normalProcQuantity: 120,
            rareProcQuantity: 12,
            totalTime: 45,
            individualTime: 0.75,
            craftingCost: 50000,
            totalRevenue: 90000,
            craftingProfit: 40000,
            profitPerHour: 3200000,
            displayedProfitPerHour: 3200000,
            outputs: [createOutput(2000, 'Seafood Sauce')],
            leftover: [],
            ingredientAlternatives: {},
            children: [
                {
                    ...materialNode,
                    key: 'material-deep',
                    itemId: 3000,
                    parentRecipeId: 200,
                    name: 'Deep Salt',
                },
            ],
        },
    ],
};

describe('CraftingRecipeTreePanel', () => {
    it('renderiza a estrutura compacta para material base', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeTreePanel
                node={materialNode}
                onToggleCollapse={vi.fn()}
                onToggleRareProc={vi.fn()}
                onToggleSlowCook={vi.fn()}
                onSelectMaterial={vi.fn()}
                collapsedIds={[]}
                useRareProcIds={[]}
                slowCookedIds={[]}
            />,
        );

        expect(html).toContain('Árvore de produção');
        expect(html).toContain('recipe-tree-list');
        expect(html).toContain('recipe-tree-row-material');
        expect(html).toContain('recipe-tree-material-meta');
        expect(html).toContain('recipe-tree-source-chip');
        expect(html).toContain('>Sugar<');
        expect(html).toContain('(42,5 un.)');
        expect(html).toContain('Vendor/NPC');
        expect(html).toContain('Não comercializável');
        expect(html).toContain('Custo');
    });

    it('oculta o nó raiz e inicia a árvore pelos ingredientes diretos', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeTreePanel
                node={nestedTreeNode}
                onToggleCollapse={vi.fn()}
                onToggleRareProc={vi.fn()}
                onToggleSlowCook={vi.fn()}
                onSelectMaterial={vi.fn()}
                collapsedIds={[]}
                useRareProcIds={[]}
                slowCookedIds={[]}
            />,
        );

        expect(html).toContain('recipe-tree-row-recipe');
        expect(html).toContain('recipe-tree-profit');
        expect(html).toContain('data-depth="0"');
        expect(html).toContain('data-depth="1"');
        expect(html).toContain('Usar proc raro');
        expect(html).toContain('Cozimento lento');
        expect(html).toContain('Trocar material');
        expect(html).toContain('Atual: Seafood Sauce');
        expect(html).not.toContain('>Margoria Feast<');
        expect(html).not.toContain('recipe-tree-row-root');
        expect(html).toContain('Deep Salt');
    });
});

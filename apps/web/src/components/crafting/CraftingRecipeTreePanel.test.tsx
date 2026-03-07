import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { RecipeTreeNode } from '@/lib/crafting/calculator';
import { CraftingRecipeTreePanel } from './CraftingRecipeTreePanel';

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

describe('CraftingRecipeTreePanel', () => {
    it('renderiza o título do painel e o nó informado', () => {
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

        expect(html).toContain('Árvore da Receita');
        expect(html).toContain('>Sugar<');
        expect(html).toContain('42.50 un.');
        expect(html).toContain('Vendor/NPC');
        expect(html).toContain('Não comercializável');
    });
});
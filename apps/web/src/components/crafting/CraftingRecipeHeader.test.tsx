import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CraftingRecipeHeader } from './CraftingRecipeHeader';

describe('CraftingRecipeHeader', () => {
    it('renderiza controles de cooking e label de árvore quando settings está aberto', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeHeader
                recipeName="Beer"
                recipeType="cooking"
                resultQuantity={2.5}
                resultItemGrade={1}
                resultItemIconUrl={null}
                resultPrice={12345}
                resultPriceSource="market"
                craftQuantity={1000}
                slowCookEnabled={true}
                showSettings={true}
                onBack={vi.fn()}
                onCraftQuantityChange={vi.fn()}
                onToggleSlowCook={vi.fn()}
                onToggleShowSettings={vi.fn()}
            />,
        );

        expect(html).toContain('>Beer<');
        expect(html).toContain('>cooking<');
        expect(html).toContain('Resultado base: 2.5 por craft');
        expect(html).toContain('Preço de referência: 12.345');
        expect(html).toContain('Mercado');
        expect(html).toContain('Quantidade');
        expect(html).toContain('value="1000"');
        expect(html).toContain('Cozimento lento');
        expect(html).toContain('checked=""');
        expect(html).toContain('>Árvore<');
    });

    it('oculta slow cook para alchemy e mantém label de settings quando fechado', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeHeader
                recipeName="Elixir"
                recipeType="alchemy"
                resultQuantity={1}
                resultItemGrade={2}
                resultItemIconUrl={null}
                resultPrice={4500}
                resultPriceSource="vendor"
                craftQuantity={250}
                slowCookEnabled={false}
                showSettings={false}
                onBack={vi.fn()}
                onCraftQuantityChange={vi.fn()}
                onToggleSlowCook={vi.fn()}
                onToggleShowSettings={vi.fn()}
            />,
        );

        expect(html).toContain('>Elixir<');
        expect(html).toContain('>alchemy<');
        expect(html).toContain('Resultado base: 1 por craft');
        expect(html).toContain('Vendor/NPC');
        expect(html).toContain('>Configurações<');
        expect(html).not.toContain('Cozimento lento');
    });
});
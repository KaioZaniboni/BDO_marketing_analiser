import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
    CraftingRecipeLoadingState,
    CraftingRecipeNotFoundState,
} from './CraftingRecipeStates';

describe('CraftingRecipeStates', () => {
    it('renderiza o estado de loading com skeletons esperados', () => {
        const html = renderToStaticMarkup(<CraftingRecipeLoadingState />);

        expect(html).toContain('skeleton h-10 w-1/3');
        expect(html).toContain('skeleton h-96 w-full');
    });

    it('renderiza o estado de receita não encontrada com CTA de retorno', () => {
        const html = renderToStaticMarkup(
            <CraftingRecipeNotFoundState onBack={vi.fn()} />,
        );

        expect(html).toContain('Receita não encontrada.');
        expect(html).toContain('>Voltar<');
        expect(html).toContain('rounded-xl border border-border bg-bg-hover px-4 py-2 text-primary');
    });
});
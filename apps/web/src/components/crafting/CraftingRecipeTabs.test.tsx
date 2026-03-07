import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DetailTabsHeader } from './CraftingRecipeTabs';

describe('DetailTabsHeader', () => {
    it('renderiza todas as tabs e destaca a tab ativa', () => {
        const html = renderToStaticMarkup(
            <DetailTabsHeader activeTab="analytics" onChange={vi.fn()} />,
        );

        expect(html).toContain('data-tab="inputs"');
        expect(html).toContain('data-tab="outputs"');
        expect(html).toContain('data-tab="analytics"');
        expect(html).toContain('data-tab="weight"');
        expect(html).toContain('>Inputs<');
        expect(html).toContain('>Outputs<');
        expect(html).toContain('>Analytics<');
        expect(html).toContain('>Weight<');

        const analyticsSegment = html.split('data-tab="analytics"')[1] ?? '';
        const inputsSegment = html.split('data-tab="inputs"')[1] ?? '';

        expect(analyticsSegment).toContain('aria-pressed="true"');
        expect(analyticsSegment).toContain('bg-gold/10 text-gold');
        expect(inputsSegment).toContain('aria-pressed="false"');
        expect(inputsSegment).toContain('text-secondary hover:text-primary');
    });
});
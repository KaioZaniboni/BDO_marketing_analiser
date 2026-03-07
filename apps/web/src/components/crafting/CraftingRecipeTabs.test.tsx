import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DetailTabsHeader } from './CraftingRecipeTabs';

describe('DetailTabsHeader', () => {
    it('renderiza todas as tabs e destaca a tab ativa', () => {
        const html = renderToStaticMarkup(
            <DetailTabsHeader activeTab="analytics" onChange={vi.fn()} />,
        );

        expect(html).toContain('data-tab="overview"');
        expect(html).toContain('data-tab="analytics"');
        expect(html).toContain('data-tab="weight"');
        expect(html).toContain('>Entrada &amp; saída<');
        expect(html).toContain('>Análise<');
        expect(html).toContain('>Peso<');

        const analyticsSegment = html.split('data-tab="analytics"')[1] ?? '';
        const overviewSegment = html.split('data-tab="overview"')[1] ?? '';

        expect(analyticsSegment).toContain('aria-pressed="true"');
        expect(analyticsSegment).toContain('bg-gold/10 text-gold');
        expect(overviewSegment).toContain('aria-pressed="false"');
        expect(overviewSegment).toContain('text-secondary hover:text-primary');
    });
});
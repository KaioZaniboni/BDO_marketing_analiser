import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { mockMarketSearchItemsQuery } = vi.hoisted(() => ({
    mockMarketSearchItemsQuery: vi.fn(() => ({
        data: [],
        isFetching: false,
        refetch: vi.fn(),
    })),
}));

vi.mock('@/lib/trpc', () => ({
    trpc: {
        market: {
            searchItems: { useQuery: mockMarketSearchItemsQuery },
        },
    },
}));

import { InventoryImportReviewRow } from './inventory-import-review-row';

describe('InventoryImportReviewRow', () => {
    it('renderiza quantidade editável e candidatos com apoio visual para revisão do OCR', () => {
        const html = renderToStaticMarkup(
            <InventoryImportReviewRow
                rowIndex={0}
                row={{
                    rawName: 'Essência da Floresta',
                    normalizedName: 'essencia da floresta',
                    quantity: 120,
                    originalQuantity: 90,
                    status: 'ambiguous',
                    matchedItemId: 5401,
                    recognitionMode: 'text',
                    captureEvidence: {
                        mode: 'ocr-line',
                        imageUrl: 'data:image/png;base64,capture-line',
                        quantityImageUrl: 'data:image/png;base64,capture-qty',
                        sourceLabel: 'inventario.png · linha OCR',
                    },
                    candidates: [
                        {
                            id: 5401,
                            name: 'Essência da Floresta',
                            iconUrl: 'New_Icon/03_ETC/08_Potion/00000504',
                            grade: 2,
                            score: 0.91,
                        },
                    ],
                }}
                selectedItemId={5401}
                onSelectionChange={vi.fn()}
                onQuantityChange={vi.fn()}
            />,
        );

        expect(html).toContain('Quantidade confirmada');
        expect(html).toContain('Item 01');
        expect(html).toContain('Comparação visual');
        expect(html).toContain('Captura da linha OCR');
        expect(html).toContain('inventario.png · linha OCR');
        expect(html).toContain('Nome detectado');
        expect(html).toContain('Nome lido');
        expect(html).toContain('Item confirmado');
        expect(html).toContain('Ação recomendada');
        expect(html).toContain('Revisão final');
        expect(html).toContain('Metadados da seleção');
        expect(html).toContain('O que revisar agora');
        expect(html).toContain('OCR original');
        expect(html).toContain('90');
        expect(html).toContain('Confirmada');
        expect(html).toContain('Ajustada');
        expect(html).toContain('value="120"');
        expect(html).toContain('Busca manual');
        expect(html).toContain('A busca roda automaticamente após uma pequena pausa');
        expect(html).toContain('Essência da Floresta');
        expect(html).toContain('Origem da seleção: OCR');
        expect(html).toContain('Score 0.91');
        expect(html).toContain('Candidato sugerido pelo OCR confirmado na revisão.');
        expect(html).toContain('Candidatos sugeridos');
        expect(html).toContain('Azul');
        expect(html).toContain('data:image/png;base64,capture-line');
        expect(html).toContain('data:image/png;base64,capture-qty');
        expect(html).toContain('https://cdn.bdolytics.com/img/new_icon/03_etc/08_potion/00000504.webp');
    });
});
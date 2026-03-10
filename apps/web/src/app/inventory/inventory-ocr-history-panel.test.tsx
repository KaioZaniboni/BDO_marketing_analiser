import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InventoryOcrHistoryPanel } from './inventory-ocr-history-panel';

describe('InventoryOcrHistoryPanel', () => {
    it('renderiza os lotes OCR com texto bruto e itens importados', () => {
        const html = renderToStaticMarkup(
            <InventoryOcrHistoryPanel
                isLoading={false}
                history={[
                    {
                        id: 12,
                        ocrTexts: ['Açúcar 120', 'Farinha 30'],
                        importedRowCount: 2,
                        importedQuantityTotal: 150,
                        createdAt: new Date('2026-03-09T18:30:00.000Z'),
                        importedItems: [
                            {
                                id: 1,
                                rawName: 'Acucar',
                                originalQuantity: 120,
                                confirmedQuantity: 120,
                                score: 1,
                                selectionSource: 'ocr',
                                selectedItem: {
                                    id: 5401,
                                    name: 'Açúcar',
                                    iconUrl: null,
                                },
                            },
                        ],
                    },
                ]}
            />,
        );

        expect(html).toContain('Lote OCR #12');
        expect(html).toContain('Clique para expandir detalhes do lote');
        expect(html).toContain('Texto bruto OCR');
        expect(html).toContain('Açúcar');
        expect(html).toContain('OCR original: Acucar');
        expect(html).toContain('Score:');
    });
});
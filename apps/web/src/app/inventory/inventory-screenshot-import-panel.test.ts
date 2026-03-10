import { describe, expect, it } from 'vitest';
import { getInventoryReviewBucket } from './inventory-screenshot-import-panel';

describe('getInventoryReviewBucket', () => {
    it('prioriza como decisão pendente quando ainda não há item confirmado', () => {
        expect(getInventoryReviewBucket({
            status: 'unmatched',
            quantity: 120,
            originalQuantity: 120,
        }, null)).toBe('decision');
    });

    it('marca como revisão final quando houve ajuste de quantidade ou match ambíguo', () => {
        expect(getInventoryReviewBucket({
            status: 'ambiguous',
            quantity: 120,
            originalQuantity: 90,
        }, 5401)).toBe('check');
    });

    it('marca como pronto quando item e quantidade já estão estáveis', () => {
        expect(getInventoryReviewBucket({
            status: 'matched',
            quantity: 120,
            originalQuantity: 120,
        }, 5401)).toBe('ready');
    });
});
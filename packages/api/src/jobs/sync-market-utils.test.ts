import { describe, expect, it } from 'vitest';
import {
    MAX_PRICE_HISTORY_VOLUME,
    getMarketPriceValue,
    getPriceHistoryRecordedDate,
    normalizePositiveIds,
    normalizePositiveLimit,
    normalizeSyncMarketPersistMode,
    shouldLogProgress,
    shouldPersistItemPrice,
    shouldPersistPriceHistory,
    toPriceHistoryVolume,
} from './sync-market-utils';

describe('sync-market-utils', () => {
    it('usa lastSoldPrice quando disponível', () => {
        expect(getMarketPriceValue({ basePrice: 1200, lastSoldPrice: 1500 })).toBe(1500n);
    });

    it('faz fallback para basePrice quando lastSoldPrice não existe', () => {
        expect(getMarketPriceValue({ basePrice: 1200, lastSoldPrice: null })).toBe(1200n);
    });

    it('normaliza limite positivo para smoke test', () => {
        expect(normalizePositiveLimit(25.9)).toBe(25);
        expect(normalizePositiveLimit(0)).toBeNull();
        expect(normalizePositiveLimit(-1)).toBeNull();
    });

    it('normaliza e deduplica ids explícitos de validação', () => {
        expect(normalizePositiveIds([9213, 0, 9735, 9213, -1, null])).toEqual([9213, 9735]);
    });

    it('normaliza o modo de persistência do sync', () => {
        expect(normalizeSyncMarketPersistMode(undefined)).toBe('full');
        expect(normalizeSyncMarketPersistMode(' snapshot ')).toBe('snapshot');
        expect(normalizeSyncMarketPersistMode('history')).toBe('history');
        expect(normalizeSyncMarketPersistMode('invalido')).toBe('full');
    });

    it('separa corretamente snapshot atual e histórico diário', () => {
        expect(shouldPersistItemPrice('snapshot')).toBe(true);
        expect(shouldPersistPriceHistory('snapshot')).toBe(false);
        expect(shouldPersistItemPrice('history')).toBe(false);
        expect(shouldPersistPriceHistory('history')).toBe(true);
        expect(shouldPersistItemPrice('full')).toBe(true);
        expect(shouldPersistPriceHistory('full')).toBe(true);
    });

    it('só emite log de progresso no intervalo configurado ou no final', () => {
        expect(shouldLogProgress(50, 200, 100)).toBe(false);
        expect(shouldLogProgress(100, 200, 100)).toBe(true);
        expect(shouldLogProgress(199, 200, 100)).toBe(false);
        expect(shouldLogProgress(200, 200, 100)).toBe(true);
    });

    it('limita o volume diário ao máximo suportado por Int', () => {
        expect(toPriceHistoryVolume(MAX_PRICE_HISTORY_VOLUME + 999)).toBe(MAX_PRICE_HISTORY_VOLUME);
    });

    it('zera volume inválido', () => {
        expect(toPriceHistoryVolume(-10)).toBe(0);
    });

    it('normaliza a data para o início do dia', () => {
        const date = getPriceHistoryRecordedDate(new Date(2026, 2, 6, 18, 45, 12, 123));
        expect(date.getHours()).toBe(0);
        expect(date.getMinutes()).toBe(0);
        expect(date.getSeconds()).toBe(0);
        expect(date.getMilliseconds()).toBe(0);
    });
});
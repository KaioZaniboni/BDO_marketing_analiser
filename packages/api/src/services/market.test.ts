import { describe, expect, it } from 'vitest';
import {
    assertSupportedMarketRegion,
    getConfiguredMarketRegion,
    parseMarketItemResponse,
    resolveMarketServiceConfig,
} from './market';

describe('market service', () => {
    it('aceita payload válido do endpoint v2/item sem resultCode', () => {
        expect(parseMarketItemResponse({
            id: 9213,
            basePrice: 3050,
            currentStock: 40151,
            totalTrades: 1054920198,
            priceMin: 328,
            priceMax: 3270,
            lastSoldPrice: 3200,
            lastSoldTime: 1741298077,
        }, 9213)).toEqual({
            id: 9213,
            minEnhance: 0,
            maxEnhance: 0,
            basePrice: 3050,
            currentStock: 40151,
            totalTrades: 1054920198,
            priceMin: 328,
            priceMax: 3270,
            lastSoldPrice: 3200,
            lastSoldTime: 1741298077,
        });
    });

    it('rejeita payload com resultCode de erro', () => {
        expect(parseMarketItemResponse({ id: 9213, resultCode: 99 }, 9213)).toBeNull();
    });

    it('normaliza a configuração da Arsha para SA', () => {
        expect(resolveMarketServiceConfig({
            ARSHA_API_URL: 'https://api.arsha.io/',
            ARSHA_REGION: ' SA ',
            ARSHA_LANG: ' PT ',
        })).toEqual({
            baseUrl: 'https://api.arsha.io',
            region: 'sa',
            lang: 'pt',
        });
    });

    it('falha explicitamente quando a região configurada não é SA', () => {
        expect(() => assertSupportedMarketRegion('na')).toThrow("esperado 'sa'");
    });

    it('expõe a região configurada como SA por padrão', () => {
        expect(getConfiguredMarketRegion({})).toBe('sa');
    });
});
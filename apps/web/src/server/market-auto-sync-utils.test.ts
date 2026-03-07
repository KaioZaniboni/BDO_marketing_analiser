import { describe, expect, it } from 'vitest';
import {
    DEFAULT_HISTORY_CHECK_INTERVAL_MS,
    DEFAULT_SNAPSHOT_CHECK_INTERVAL_MS,
    DEFAULT_SNAPSHOT_MAX_AGE_MS,
    DEFAULT_STARTUP_DELAY_MS,
    isHistoryStale,
    isSnapshotStale,
    resolveMarketAutoSyncConfig,
} from './market-auto-sync-utils';

describe('market-auto-sync-utils', () => {
    it('habilita auto-sync por padrão fora de test e Vercel', () => {
        expect(resolveMarketAutoSyncConfig({
            NODE_ENV: 'development',
            VERCEL: '0',
        })).toEqual({
            enabled: true,
            snapshotMaxAgeMs: DEFAULT_SNAPSHOT_MAX_AGE_MS,
            snapshotCheckIntervalMs: DEFAULT_SNAPSHOT_CHECK_INTERVAL_MS,
            historyCheckIntervalMs: DEFAULT_HISTORY_CHECK_INTERVAL_MS,
            startupDelayMs: DEFAULT_STARTUP_DELAY_MS,
        });
    });

    it('desabilita auto-sync por padrão em test e Vercel', () => {
        expect(resolveMarketAutoSyncConfig({
            NODE_ENV: 'test',
        }).enabled).toBe(false);

        expect(resolveMarketAutoSyncConfig({
            NODE_ENV: 'production',
            VERCEL: '1',
        }).enabled).toBe(false);
    });

    it('aceita overrides explícitos por variável de ambiente', () => {
        expect(resolveMarketAutoSyncConfig({
            NODE_ENV: 'production',
            MARKET_AUTO_SYNC_ENABLED: 'true',
            MARKET_SNAPSHOT_MAX_AGE_MS: '120000',
            MARKET_SNAPSHOT_CHECK_INTERVAL_MS: '45000',
            MARKET_HISTORY_CHECK_INTERVAL_MS: '900000',
            MARKET_AUTO_SYNC_STARTUP_DELAY_MS: '2500',
        })).toEqual({
            enabled: true,
            snapshotMaxAgeMs: 120000,
            snapshotCheckIntervalMs: 45000,
            historyCheckIntervalMs: 900000,
            startupDelayMs: 2500,
        });
    });

    it('considera snapshot ausente ou antigo como stale', () => {
        const now = new Date('2026-03-07T12:00:00.000Z');

        expect(isSnapshotStale(null, 15 * 60 * 1000, now)).toBe(true);
        expect(isSnapshotStale(new Date('2026-03-07T11:40:00.000Z'), 15 * 60 * 1000, now)).toBe(true);
        expect(isSnapshotStale(new Date('2026-03-07T11:50:01.000Z'), 15 * 60 * 1000, now)).toBe(false);
    });

    it('considera histórico stale quando ainda não existe registro do dia', () => {
        const now = new Date('2026-03-07T12:00:00.000Z');

        expect(isHistoryStale(null, now)).toBe(true);
        expect(isHistoryStale(new Date('2026-03-06T00:00:00.000Z'), now)).toBe(true);
        expect(isHistoryStale(new Date('2026-03-07T00:00:00.000Z'), now)).toBe(false);
    });
});

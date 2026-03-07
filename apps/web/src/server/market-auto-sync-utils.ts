const DEFAULT_SNAPSHOT_MAX_AGE_MS = 15 * 60 * 1000;
const DEFAULT_SNAPSHOT_CHECK_INTERVAL_MS = 60 * 1000;
const DEFAULT_HISTORY_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_STARTUP_DELAY_MS = 5 * 1000;

export interface MarketAutoSyncConfig {
    enabled: boolean;
    snapshotMaxAgeMs: number;
    snapshotCheckIntervalMs: number;
    historyCheckIntervalMs: number;
    startupDelayMs: number;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
    const normalizedValue = value?.trim().toLowerCase();

    if (!normalizedValue) {
        return fallback;
    }

    if (normalizedValue === 'true') {
        return true;
    }

    if (normalizedValue === 'false') {
        return false;
    }

    return fallback;
}

function parsePositiveIntegerEnv(value: string | undefined, fallback: number): number {
    const parsedValue = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function resolveMarketAutoSyncConfig(env: NodeJS.ProcessEnv = process.env): MarketAutoSyncConfig {
    const defaultEnabled = env.NODE_ENV !== 'test' && env.VERCEL !== '1';

    return {
        enabled: parseBooleanEnv(env.MARKET_AUTO_SYNC_ENABLED, defaultEnabled),
        snapshotMaxAgeMs: parsePositiveIntegerEnv(env.MARKET_SNAPSHOT_MAX_AGE_MS, DEFAULT_SNAPSHOT_MAX_AGE_MS),
        snapshotCheckIntervalMs: parsePositiveIntegerEnv(
            env.MARKET_SNAPSHOT_CHECK_INTERVAL_MS,
            DEFAULT_SNAPSHOT_CHECK_INTERVAL_MS,
        ),
        historyCheckIntervalMs: parsePositiveIntegerEnv(
            env.MARKET_HISTORY_CHECK_INTERVAL_MS,
            DEFAULT_HISTORY_CHECK_INTERVAL_MS,
        ),
        startupDelayMs: parsePositiveIntegerEnv(env.MARKET_AUTO_SYNC_STARTUP_DELAY_MS, DEFAULT_STARTUP_DELAY_MS),
    };
}

export function isSnapshotStale(
    recordedAt: Date | null | undefined,
    maxAgeMs: number,
    now: Date = new Date(),
): boolean {
    if (!recordedAt) {
        return true;
    }

    return now.getTime() - recordedAt.getTime() >= maxAgeMs;
}

export function isHistoryStale(recordedDate: Date | null | undefined, now: Date = new Date()): boolean {
    if (!recordedDate) {
        return true;
    }

    const currentUtcDay = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
    );
    const recordedUtcDay = Date.UTC(
        recordedDate.getUTCFullYear(),
        recordedDate.getUTCMonth(),
        recordedDate.getUTCDate(),
    );

    return recordedUtcDay < currentUtcDay;
}

export {
    DEFAULT_HISTORY_CHECK_INTERVAL_MS,
    DEFAULT_SNAPSHOT_CHECK_INTERVAL_MS,
    DEFAULT_SNAPSHOT_MAX_AGE_MS,
    DEFAULT_STARTUP_DELAY_MS,
};

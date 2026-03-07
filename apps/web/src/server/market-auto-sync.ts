import { prisma } from '@bdo/db';
import {
    syncMarketHistoryPrices,
    syncMarketSnapshotPrices,
} from '@bdo/api/src/jobs/sync-market';
import {
    isHistoryStale,
    isSnapshotStale,
    resolveMarketAutoSyncConfig,
} from './market-auto-sync-utils';

type SyncMode = 'snapshot' | 'history';
type TimerHandle = ReturnType<typeof setInterval>;

interface MarketAutoSyncState {
    started: boolean;
    inFlightMode: SyncMode | null;
    inFlightPromise: Promise<void> | null;
    snapshotTimer: TimerHandle | null;
    historyTimer: TimerHandle | null;
}

const globalForMarketAutoSync = globalThis as typeof globalThis & {
    __bdoMarketAutoSyncState?: MarketAutoSyncState;
};

function getMarketAutoSyncState(): MarketAutoSyncState {
    if (!globalForMarketAutoSync.__bdoMarketAutoSyncState) {
        globalForMarketAutoSync.__bdoMarketAutoSyncState = {
            started: false,
            inFlightMode: null,
            inFlightPromise: null,
            snapshotTimer: null,
            historyTimer: null,
        };
    }

    return globalForMarketAutoSync.__bdoMarketAutoSyncState;
}

function createAutoSyncLogger(mode: SyncMode, trigger: string): Pick<Console, 'log' | 'error'> {
    const prefix = `[market-auto-sync:${mode}:${trigger}]`;

    return {
        log: (...args) => console.log(prefix, ...args),
        error: (...args) => console.error(prefix, ...args),
    };
}

function unrefTimer(timer: ReturnType<typeof setTimeout>) {
    if (typeof timer.unref === 'function') {
        timer.unref();
    }
}

async function getLatestSnapshotRecordedAt(): Promise<Date | null> {
    const result = await prisma.itemPrice.aggregate({
        _max: { recordedAt: true },
    });

    return result._max.recordedAt ?? null;
}

async function getLatestHistoryRecordedDate(): Promise<Date | null> {
    const result = await prisma.priceHistory.aggregate({
        _max: { recordedDate: true },
    });

    return result._max.recordedDate ?? null;
}

function runExclusiveSync(mode: SyncMode, trigger: string, task: () => Promise<void>) {
    const state = getMarketAutoSyncState();

    if (state.inFlightPromise) {
        return state.inFlightPromise;
    }

    const logger = createAutoSyncLogger(mode, trigger);
    state.inFlightMode = mode;
    state.inFlightPromise = task()
        .catch((error) => {
            logger.error('Falha no auto-sync.', error);
        })
        .finally(() => {
            state.inFlightMode = null;
            state.inFlightPromise = null;
        });

    return state.inFlightPromise;
}

async function syncSnapshotIfStale(trigger: string): Promise<void> {
    const config = resolveMarketAutoSyncConfig();
    if (!config.enabled) {
        return;
    }

    const latestSnapshot = await getLatestSnapshotRecordedAt();
    if (!isSnapshotStale(latestSnapshot, config.snapshotMaxAgeMs)) {
        return;
    }

    await runExclusiveSync('snapshot', trigger, async () => {
        const logger = createAutoSyncLogger('snapshot', trigger);
        logger.log(`Snapshot desatualizado. Último registro: ${latestSnapshot?.toISOString() ?? 'ausente'}.`);
        await syncMarketSnapshotPrices({ logger });
    });
}

async function syncHistoryIfStale(trigger: string): Promise<void> {
    const config = resolveMarketAutoSyncConfig();
    if (!config.enabled) {
        return;
    }

    const latestHistory = await getLatestHistoryRecordedDate();
    if (!isHistoryStale(latestHistory)) {
        return;
    }

    await runExclusiveSync('history', trigger, async () => {
        const logger = createAutoSyncLogger('history', trigger);
        logger.log(`Histórico diário desatualizado. Última data: ${latestHistory?.toISOString() ?? 'ausente'}.`);
        await syncMarketHistoryPrices({ logger });
    });
}

export function startMarketAutoSync(): void {
    const config = resolveMarketAutoSyncConfig();
    const state = getMarketAutoSyncState();

    if (!config.enabled || state.started) {
        return;
    }

    state.started = true;

    const startupTimer = setTimeout(() => {
        void (async () => {
            await syncSnapshotIfStale('startup');
            await syncHistoryIfStale('startup');
        })();
    }, config.startupDelayMs);
    unrefTimer(startupTimer);

    state.snapshotTimer = setInterval(() => {
        void syncSnapshotIfStale('interval');
    }, config.snapshotCheckIntervalMs);
    unrefTimer(state.snapshotTimer);

    state.historyTimer = setInterval(() => {
        void syncHistoryIfStale('interval');
    }, config.historyCheckIntervalMs);
    unrefTimer(state.historyTimer);

    console.log(
        '[market-auto-sync] Auto-sync interno ativado.',
        {
            snapshotMaxAgeMs: config.snapshotMaxAgeMs,
            snapshotCheckIntervalMs: config.snapshotCheckIntervalMs,
            historyCheckIntervalMs: config.historyCheckIntervalMs,
        },
    );
}

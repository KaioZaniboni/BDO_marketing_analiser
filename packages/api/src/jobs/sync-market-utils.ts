const MAX_PRICE_HISTORY_VOLUME = 2_147_483_647;

export type SyncMarketPersistMode = 'full' | 'snapshot' | 'history';

export function getMarketPriceValue(data: { basePrice: number; lastSoldPrice?: number | null }): bigint {
    const snapshotPrice = Number(data.lastSoldPrice ?? data.basePrice ?? 0);
    return BigInt(Math.max(0, snapshotPrice));
}

export function normalizePositiveLimit(limit?: number | null): number | null {
    const parsed = Math.trunc(Number(limit ?? 0));

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export function normalizePositiveIds(values?: Array<number | null | undefined> | null): number[] {
    const normalizedIds = (values ?? [])
        .map((value) => normalizePositiveLimit(value))
        .filter((value): value is number => value !== null);

    return Array.from(new Set(normalizedIds));
}

export function normalizeSyncMarketPersistMode(mode?: string | null): SyncMarketPersistMode {
    const normalizedMode = String(mode ?? '').trim().toLowerCase();

    if (normalizedMode === 'snapshot' || normalizedMode === 'history') {
        return normalizedMode;
    }

    return 'full';
}

export function shouldPersistItemPrice(mode: SyncMarketPersistMode): boolean {
    return mode === 'full' || mode === 'snapshot';
}

export function shouldPersistPriceHistory(mode: SyncMarketPersistMode): boolean {
    return mode === 'full' || mode === 'history';
}

export function shouldLogProgress(processed: number, total: number, every: number): boolean {
    if (total <= 0 || processed <= 0) {
        return false;
    }

    const normalizedEvery = normalizePositiveLimit(every) ?? 1;
    return processed >= total || processed % normalizedEvery === 0;
}

export function toPriceHistoryVolume(totalTrades: number): number {
    const parsed = Math.trunc(Number(totalTrades ?? 0));

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.min(parsed, MAX_PRICE_HISTORY_VOLUME);
}

export function getPriceHistoryRecordedDate(referenceDate: Date = new Date()): Date {
    const recordedDate = new Date(referenceDate);
    recordedDate.setHours(0, 0, 0, 0);
    return recordedDate;
}

export { MAX_PRICE_HISTORY_VOLUME };
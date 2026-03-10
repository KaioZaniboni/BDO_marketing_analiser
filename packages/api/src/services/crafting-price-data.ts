type SnapshotLike = {
    basePrice: bigint;
    lastSoldPrice: bigint | null;
};

export const VENDOR_PRICE_MAP: Record<number, number> = {
    5867: 50,
    6397: 100,
    7304: 700,
    7312: 850,
    8198: 1_000,
    9001: 20,
    9002: 20,
    9005: 20,
    9009: 200,
    9015: 40,
    9016: 40,
    9017: 40,
    9018: 40,
    9019: 50_000,
    9024: 30,
    9059: 30,
    9780: 0,
    9781: 0,
    16101: 1_000,
    54025: 100_000,
    54031: 500_000,
    4925: 100_000,
    4986: 10_000,
    4915: 5_000_000,
    5651: 10_000,
    757006: 20_000_000,
    820015: 10_000,
    820936: 1_000_000,
};

function toNumber(value: bigint | number | null | undefined): number {
    if (typeof value === 'bigint') {
        return Number(value);
    }

    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getCraftingItemUnitPrice(
    itemId: number,
    snapshot: SnapshotLike | null | undefined,
): { unitPrice: number; source: 'market' | 'vendor' | 'missing' } {
    const marketPrice = toNumber(snapshot?.lastSoldPrice ?? snapshot?.basePrice ?? 0);
    if (marketPrice > 0) {
        return { unitPrice: marketPrice, source: 'market' };
    }

    const vendorPrice = VENDOR_PRICE_MAP[itemId];
    if (vendorPrice !== undefined) {
        return { unitPrice: vendorPrice, source: 'vendor' };
    }

    return { unitPrice: 0, source: 'missing' };
}

import { syncMarketPrices } from './sync-market';
import {
    normalizePositiveIds,
    normalizePositiveLimit,
    normalizeSyncMarketPersistMode,
} from './sync-market-utils';

async function main() {
    const rawLimit = process.env.SYNC_MARKET_LIMIT ? Number(process.env.SYNC_MARKET_LIMIT) : null;
    const limit = normalizePositiveLimit(rawLimit) ?? undefined;
    const persistMode = normalizeSyncMarketPersistMode(process.env.SYNC_MARKET_MODE);
    const itemIds = normalizePositiveIds(
        process.env.SYNC_MARKET_ITEM_IDS?.split(',').map((value) => Number(value.trim())) ?? [],
    );

    console.log('START_SYNC');
    console.log(`SYNC_MARKET_MODE=${persistMode}`);
    if (limit) {
        console.log(`SYNC_MARKET_LIMIT=${limit}`);
    }
    if (itemIds.length > 0) {
        console.log(`SYNC_MARKET_ITEM_IDS=${itemIds.join(',')}`);
    }

    const result = await syncMarketPrices({ limit, itemIds, persistMode });
    console.log(
        `DONE_SYNC processed=${result.processedItemCount} itemPrice=${result.itemPriceUpserts} priceHistory=${result.priceHistoryUpserts}`,
    );
}

main().catch((error) => {
    console.error('SYNC_ERROR', error);
    process.exit(1);
});


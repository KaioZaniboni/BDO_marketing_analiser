import { syncMarketHistoryPrices } from '@bdo/api/src/jobs/sync-market';
import { runMarketSyncCron } from '../route-utils';

export async function GET(req: Request) {
    return runMarketSyncCron(req, 'history', () => syncMarketHistoryPrices());
}
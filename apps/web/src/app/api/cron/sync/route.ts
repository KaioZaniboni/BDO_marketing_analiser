import { syncMarketPrices } from '@bdo/api/src/jobs/sync-market';
import { runMarketSyncCron } from './route-utils';

export async function GET(req: Request) {
    return runMarketSyncCron(req, 'full', () => syncMarketPrices({ persistMode: 'full' }));
}

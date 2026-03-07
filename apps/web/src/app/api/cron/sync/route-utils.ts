import { NextResponse } from 'next/server';
import type { SyncMarketPricesResult } from '@bdo/api/src/jobs/sync-market';
import type { SyncMarketPersistMode } from '@bdo/api/src/jobs/sync-market-utils';
import { getConfiguredMarketRegion } from '@bdo/api/src/services/market';
import { authorizeCronRequest, getCronSuccessMessage } from './cron-utils';

export async function runMarketSyncCron(
    req: Request,
    mode: SyncMarketPersistMode,
    runner: () => Promise<SyncMarketPricesResult>,
) {
    const authResult = authorizeCronRequest(req);
    if (!authResult.ok) {
        return NextResponse.json(
            { success: false, mode, error: authResult.error },
            { status: authResult.status },
        );
    }

    try {
        const region = getConfiguredMarketRegion();
        const result = await runner();

        return NextResponse.json({
            success: true,
            mode,
            region,
            message: getCronSuccessMessage(mode),
            result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar mercado.';
        console.error(`Falha no Cron de Sync de Market [${mode}]:`, error);

        return NextResponse.json(
            { success: false, mode, error: message },
            { status: 500 },
        );
    }
}
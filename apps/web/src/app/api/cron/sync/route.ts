import { NextResponse } from 'next/server';
import { syncMarketPrices } from '@bdo/api/src/jobs/sync-market';

/**
 * Route Handler para iniciar a Sincronização de Preços via API.
 * Em produção deve-se proteger essa rota por Cron ou um Secret Header.
 */
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret123'}`) {
            // Warning: Exemplo simples - remova ou mude o fallback em PROD
            // return new Response('Unauthorized', { status: 401 }); 
        }

        await syncMarketPrices();

        return NextResponse.json({ success: true, message: 'Mercado sincronizado' });
    } catch (error: any) {
        console.error('Falha no Cron de Sync de Market:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

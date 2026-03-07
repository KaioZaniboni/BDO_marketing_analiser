import type { SyncMarketPersistMode } from '@bdo/api/src/jobs/sync-market-utils';

export interface CronAuthorizationResult {
    ok: boolean;
    status: number;
    error?: string;
}

export function getCronSecret(env: NodeJS.ProcessEnv = process.env): string | null {
    const cronSecret = env.CRON_SECRET?.trim();
    return cronSecret && cronSecret.length > 0 ? cronSecret : null;
}

export function authorizeCronRequest(
    req: Request,
    env: NodeJS.ProcessEnv = process.env,
): CronAuthorizationResult {
    const cronSecret = getCronSecret(env);

    if (!cronSecret) {
        return {
            ok: false,
            status: 500,
            error: 'CRON_SECRET não configurado.',
        };
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return {
            ok: false,
            status: 401,
            error: 'Unauthorized',
        };
    }

    return {
        ok: true,
        status: 200,
    };
}

export function getCronSuccessMessage(mode: SyncMarketPersistMode): string {
    if (mode === 'snapshot') {
        return 'Snapshot atual do mercado sincronizado.';
    }

    if (mode === 'history') {
        return 'Histórico diário do mercado sincronizado.';
    }

    return 'Mercado sincronizado.';
}
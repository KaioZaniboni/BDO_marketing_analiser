import { describe, expect, it } from 'vitest';
import { authorizeCronRequest, getCronSecret, getCronSuccessMessage } from './cron-utils';

function createEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
    return {
        NODE_ENV: 'test',
        ...overrides,
    };
}

describe('cron utils', () => {
    it('exige CRON_SECRET configurado', () => {
        const request = new Request('http://localhost/api/cron/sync');
        const env = createEnv();

        expect(getCronSecret(env)).toBeNull();
        expect(authorizeCronRequest(request, env)).toEqual({
            ok: false,
            status: 500,
            error: 'CRON_SECRET não configurado.',
        });
    });

    it('rejeita requests sem bearer token válido', () => {
        const request = new Request('http://localhost/api/cron/sync', {
            headers: { authorization: 'Bearer invalido' },
        });
        const env = createEnv({ CRON_SECRET: 'segredo-correto' });

        expect(authorizeCronRequest(request, env)).toEqual({
            ok: false,
            status: 401,
            error: 'Unauthorized',
        });
    });

    it('aceita requests com bearer token válido', () => {
        const request = new Request('http://localhost/api/cron/sync', {
            headers: { authorization: 'Bearer segredo-correto' },
        });
        const env = createEnv({ CRON_SECRET: 'segredo-correto' });

        expect(authorizeCronRequest(request, env)).toEqual({
            ok: true,
            status: 200,
        });
    });

    it('gera mensagens coerentes para cada modo de sync', () => {
        expect(getCronSuccessMessage('snapshot')).toContain('Snapshot atual');
        expect(getCronSuccessMessage('history')).toContain('Histórico diário');
        expect(getCronSuccessMessage('full')).toBe('Mercado sincronizado.');
    });
});
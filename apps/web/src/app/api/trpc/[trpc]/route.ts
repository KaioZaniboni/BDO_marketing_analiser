import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, type Context } from '@bdo/api';
import { prisma } from '@bdo/db';
import { startMarketAutoSync } from '@/server/market-auto-sync';

/**
 * Handler do tRPC para Next.js App Router.
 * Processa todas as requisições POST/GET em /api/trpc/[trpc]
 */
function handler(req: Request) {
    startMarketAutoSync();

    return fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: async (): Promise<Context> => {
            // TODO: Integrar com NextAuth para extrair a sessão
            return {
                prisma,
                session: null,
            };
        },
    });
}

export { handler as GET, handler as POST };

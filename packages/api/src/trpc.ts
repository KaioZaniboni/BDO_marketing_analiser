import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type PrismaClient } from '@bdo/db';

/**
 * Contexto compartilhado entre todas as procedures do tRPC.
 * Inclui o Prisma client e (opcionalmente) a sessão do usuário.
 */
export interface Context {
    prisma: PrismaClient;
    session: {
        userId: number;
        username: string;
    } | null;
}

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape;
    },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Middleware que exige autenticação.
 * Joga TRPCError UNAUTHORIZED se não houver sessão.
 */
const enforceAuth = middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

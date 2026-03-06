import { PrismaClient } from '@prisma/client';

/**
 * Singleton do PrismaClient para evitar múltiplas conexões em dev (hot reload).
 * Em produção, cada instância terá seu próprio client.
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Re-exporta tipos do Prisma para uso nos outros packages
export * from '@prisma/client';
export type { PrismaClient } from '@prisma/client';

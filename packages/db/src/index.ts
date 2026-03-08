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
export { Prisma, Role } from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
export { hashPassword, verifyPassword } from './auth';
export * from './recipe-catalog';
export {
    buildFallbackCanonicalKey,
    loadRecipeCurations,
    buildCanonicalCrafts,
    materializeCanonicalCraft,
    createMaterializedCanonicalCraft,
    replaceMaterializedCanonicalCraft,
    replaceAllMaterializedCanonicalCrafts,
} from './canonical-recipes.js';
export type {
    CanonicalRecipeIngredient,
    CanonicalRecipeLike,
    MaterializedCanonicalCraft,
} from './canonical-recipes.js';
export {
    buildRecipeCurationDraft,
    mergeRecipeCurations,
    normalizeRecipeCurationDraft,
    normalizeRecipeCurationRecord,
    normalizeRecipeCurationSearchTerm,
    normalizeRecipeCurationTypeFilter,
    parseRecipeCurationDraft,
    serializeRecipeCurationDraft,
} from './recipe-curation.js';
export type {
    RecipeCurationDraft,
    RecipeCurationRecord,
    RecipeCurationSource,
    RecipeCurationTypeFilter,
} from './recipe-curation.js';

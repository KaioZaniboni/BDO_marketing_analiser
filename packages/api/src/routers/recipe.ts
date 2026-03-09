import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { calculateNetMultiplier } from '../services/calculator';
import {
    analyzeCanonicalRecipeProfitability,
    buildCanonicalImperialRanking,
    buildCanonicalRanking,
} from '../services/canonical-recipe-analytics';
import {
    catalogCanonicalRecipes,
    getCanonicalRecipeDetail,
    isCanonicalRecipesUnavailableError,
    listCanonicalRecipes,
} from '../services/canonical-recipe-reader';
import { listCraftingSupportItems } from '../services/crafting-support-items';
import type { RankingWeights } from '../types';

const taxConfigSchema = z.object({
    baseTaxRate: z.number().min(0).max(1).default(0.35),
    hasValuePack: z.boolean().default(false),
    hasMerchantRing: z.boolean().default(false),
    familyFame: z.number().int().min(0).default(0),
});

const rankingWeightsSchema = z.object({
    roi: z.number().min(0).max(1).default(0.40),
    liquidity: z.number().min(0).max(1).default(0.35),
    profit: z.number().min(0).max(1).default(0.25),
});

const imperialListSchema = z.object({
    type: z.enum(['cooking', 'alchemy']).optional(),
    mastery: z.number().min(0).max(2000).default(0),
    taxConfig: taxConfigSchema.optional(),
});

async function withCanonicalRead<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (isCanonicalRecipesUnavailableError(error)) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message,
            });
        }
        throw error;
    }
}

export const recipeRouter = router({
    /** Lista todas as receitas com filtros */
    list: publicProcedure
        .input(z.object({
            type: z.enum(['cooking', 'alchemy', 'processing']).optional(),
            limit: z.number().int().min(1).max(500).default(200),
            offset: z.number().int().min(0).default(0),
            search: z.string().optional(),
        }))
        .query(({ ctx, input }) => withCanonicalRead(() => listCanonicalRecipes(ctx.prisma, input))),

    /** Catálogo completo de receitas para calculadoras client-side */
    catalog: publicProcedure
        .input(z.object({
            types: z.array(z.enum(['cooking', 'alchemy', 'processing'])).min(1).optional(),
            historyDays: z.number().int().min(1).max(60).default(28),
        }))
        .query(({ ctx, input }) => withCanonicalRead(async () => {
            const recipes = await catalogCanonicalRecipes(ctx.prisma, input);
            const supportItems = await listCraftingSupportItems(
                ctx.prisma,
                (input.types ?? ['cooking', 'alchemy', 'processing']),
            );

            return {
                recipes,
                supportItems,
            };
        })),

    /** Detalhes de uma receita por ID */
    getById: publicProcedure
        .input(z.object({ recipeId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => withCanonicalRead(async () => {
            const canonicalDetail = await getCanonicalRecipeDetail(ctx.prisma, input.recipeId);
            if (!canonicalDetail) {
                return null;
            }

            const supportItems = await listCraftingSupportItems(
                ctx.prisma,
                Array.from(new Set(canonicalDetail.treeRecipes.map((recipe) => recipe.type as 'cooking' | 'alchemy' | 'processing'))),
            );

            return {
                ...canonicalDetail.recipe,
                ingredientAlternatives: canonicalDetail.ingredientAlternatives,
                treeRecipes: canonicalDetail.treeRecipes,
                supportItems,
            };
        })),

    /** Retorna as caixas imperiais suportadas com cálculo otimizado (BDOLytics Clone) */
    getImperialRanking: publicProcedure
        .input(imperialListSchema)
        .query(({ ctx, input }) => withCanonicalRead(async () => {
            const recipes = await catalogCanonicalRecipes(ctx.prisma, {
                types: input.type ? [input.type] : ['cooking', 'alchemy'],
                historyDays: 1,
            });
            return buildCanonicalImperialRanking(recipes, input);
        })),

    /** Calcula taxa líquida do mercado */
    calculateTax: publicProcedure
        .input(taxConfigSchema)
        .query(({ input }) => {
            const multiplier = calculateNetMultiplier(input);
            return {
                multiplier,
                effectiveTaxRate: Math.round((1 - multiplier) * 10000) / 100,
                netPercentage: Math.round(multiplier * 10000) / 100,
            };
        }),

    /** Analisa lucratividade de uma receita para o usuário */
    analyzeProfitability: protectedProcedure
        .input(z.object({
            recipeId: z.number().int().positive(),
            craftCount: z.number().int().min(1).max(10000).default(1),
            taxConfig: taxConfigSchema,
        }))
        .query(async ({ ctx, input }) => withCanonicalRead(async () => {
            const recipeDetail = await getCanonicalRecipeDetail(ctx.prisma, input.recipeId);
            if (!recipeDetail) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Receita canônica não encontrada.' });
            }

            const inventory = await ctx.prisma.userInventory.findMany({
                where: { userId: ctx.session.userId },
            });
            const userInventory = new Map<number, number>(
                inventory.map((item) => [item.itemId, item.quantity] as [number, number]),
            );

            return analyzeCanonicalRecipeProfitability(
                recipeDetail.recipe,
                userInventory,
                input.taxConfig,
                input.craftCount,
            );
        })),

    /** Ranking global de receitas */
    getRanking: publicProcedure
        .input(z.object({
            type: z.enum(['cooking', 'alchemy', 'processing']).optional(),
            weights: rankingWeightsSchema.optional(),
            limit: z.number().int().min(1).max(100).default(50),
        }))
        .query(({ ctx, input }) => withCanonicalRead(async () => {
            const recipes = await catalogCanonicalRecipes(ctx.prisma, {
                types: input.type ? [input.type] : undefined,
                historyDays: 1,
                primaryOnly: true,
            });

            return buildCanonicalRanking(recipes.slice(0, input.limit), input.weights);
        })),
});

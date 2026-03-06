import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { getItemPrice, getMultipleItemPrices, getHotList } from '../services/market';

export const marketRouter = router({
    /** Busca dados de um item pelo ID */
    getItem: publicProcedure
        .input(z.object({
            itemId: z.number().int().positive(),
            sid: z.number().int().optional(),
        }))
        .query(async ({ input }) => {
            return getItemPrice(input.itemId, input.sid);
        }),

    /** Busca preços de múltiplos itens */
    getMultipleItems: publicProcedure
        .input(z.object({
            itemIds: z.array(z.number().int().positive()).max(50),
        }))
        .query(async ({ input }) => {
            const results = await getMultipleItemPrices(input.itemIds);
            return Object.fromEntries(results);
        }),

    /** Lista de itens em alta demanda */
    getHotList: publicProcedure.query(async () => {
        return getHotList();
    }),

    /** Busca item no banco de dados local */
    searchItems: publicProcedure
        .input(z.object({
            query: z.string().min(2).max(100),
            limit: z.number().int().min(1).max(50).default(20),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.item.findMany({
                where: {
                    name: { contains: input.query, mode: 'insensitive' },
                    isTradeable: true,
                },
                include: {
                    prices: {
                        where: { enhancementLevel: 0 },
                        take: 1,
                    },
                },
                take: input.limit,
                orderBy: { name: 'asc' },
            });
        }),

    /** Histórico de preços de um item */
    getPriceHistory: publicProcedure
        .input(z.object({
            itemId: z.number().int().positive(),
            days: z.number().int().min(1).max(90).default(30),
        }))
        .query(async ({ ctx, input }) => {
            const since = new Date();
            since.setDate(since.getDate() - input.days);

            return ctx.prisma.priceHistory.findMany({
                where: {
                    itemId: input.itemId,
                    recordedDate: { gte: since },
                },
                orderBy: { recordedDate: 'asc' },
            });
        }),
});

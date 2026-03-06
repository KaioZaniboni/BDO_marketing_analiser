import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const inventoryRouter = router({
    /** Lista o inventário do usuário */
    list: protectedProcedure
        .input(z.object({
            search: z.string().optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = { userId: ctx.session.userId };

            return ctx.prisma.userInventory.findMany({
                where,
                include: {
                    item: {
                        include: {
                            prices: { where: { enhancementLevel: 0 }, take: 1 },
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            });
        }),

    /** Adiciona ou atualiza item no inventário */
    upsert: protectedProcedure
        .input(z.object({
            itemId: z.number().int().positive(),
            quantity: z.number().int().min(0),
            avgAcquisitionCost: z.number().int().min(0).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (input.quantity === 0) {
                // Se quantidade é 0, remover do inventário
                await ctx.prisma.userInventory.deleteMany({
                    where: {
                        userId: ctx.session.userId,
                        itemId: input.itemId,
                    },
                });
                return { deleted: true };
            }

            return ctx.prisma.userInventory.upsert({
                where: {
                    userId_itemId: {
                        userId: ctx.session.userId,
                        itemId: input.itemId,
                    },
                },
                create: {
                    userId: ctx.session.userId,
                    itemId: input.itemId,
                    quantity: input.quantity,
                    avgAcquisitionCost: input.avgAcquisitionCost
                        ? BigInt(input.avgAcquisitionCost)
                        : null,
                },
                update: {
                    quantity: input.quantity,
                    avgAcquisitionCost: input.avgAcquisitionCost
                        ? BigInt(input.avgAcquisitionCost)
                        : undefined,
                },
            });
        }),

    /** Importação em lote (CSV) */
    bulkUpsert: protectedProcedure
        .input(z.object({
            items: z.array(z.object({
                itemId: z.number().int().positive(),
                quantity: z.number().int().min(0),
            })).max(500),
        }))
        .mutation(async ({ ctx, input }) => {
            const results = await ctx.prisma.$transaction(
                input.items.map((item) =>
                    ctx.prisma.userInventory.upsert({
                        where: {
                            userId_itemId: {
                                userId: ctx.session.userId,
                                itemId: item.itemId,
                            },
                        },
                        create: {
                            userId: ctx.session.userId,
                            itemId: item.itemId,
                            quantity: item.quantity,
                        },
                        update: {
                            quantity: item.quantity,
                        },
                    }),
                ),
            );

            return { updated: results.length };
        }),

    /** Remove item do inventário */
    delete: protectedProcedure
        .input(z.object({
            itemId: z.number().int().positive(),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.userInventory.deleteMany({
                where: {
                    userId: ctx.session.userId,
                    itemId: input.itemId,
                },
            });
            return { success: true };
        }),

    /** Resumo do inventário (valor total) */
    summary: protectedProcedure.query(async ({ ctx }) => {
        const inventory = await ctx.prisma.userInventory.findMany({
            where: { userId: ctx.session.userId },
            include: {
                item: {
                    include: {
                        prices: { where: { enhancementLevel: 0 }, take: 1 },
                    },
                },
            },
        });

        let totalValue = 0;
        let totalItems = 0;

        for (const entry of inventory) {
            totalItems += entry.quantity;
            const price = entry.item.prices[0]
                ? Number(entry.item.prices[0].lastSoldPrice ?? entry.item.prices[0].basePrice)
                : 0;
            totalValue += entry.quantity * price;
        }

        return {
            totalItems,
            uniqueItems: inventory.length,
            totalValue,
        };
    }),
});

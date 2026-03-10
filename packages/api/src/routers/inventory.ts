import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { buildInventoryImportPreview } from '../services/inventory-import';
import {
    buildInventoryScreenshotImportInventoryItems,
    INVENTORY_SCREENSHOT_IMPORT_SELECTION_SOURCES,
    summarizeInventoryScreenshotImport,
} from '../services/inventory-screenshot-import';

function normalizeOcrTexts(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function buildOcrHistoryImportedItemsWhere(input: {
    search?: string;
    selectionSource?: string;
}) {
    const where: Record<string, unknown> = {};

    if (input.selectionSource) {
        where.selectionSource = input.selectionSource;
    }

    if (input.search) {
        where.OR = [
            {
                rawName: {
                    contains: input.search,
                    mode: 'insensitive',
                },
            },
            {
                selectedItem: {
                    is: {
                        name: {
                            contains: input.search,
                            mode: 'insensitive',
                        },
                    },
                },
            },
        ];
    }

    return where;
}

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

    /** Gera preview da importação por OCR com sugestão de itens */
    previewImport: protectedProcedure
        .input(z.object({
            entries: z.array(z.object({
                rawName: z.string().min(2).max(120),
                quantity: z.number().int().min(1).max(999_999_999),
            })).min(1).max(120),
        }))
        .mutation(async ({ ctx, input }) => {
            const items = await ctx.prisma.item.findMany({
                where: { isTradeable: true },
                select: {
                    id: true,
                    name: true,
                    iconUrl: true,
                    grade: true,
                },
            });

            return buildInventoryImportPreview(input.entries, items);
        }),

    /** Lista catálogo visual mínimo para matching por ícone no frontend */
    listImportCatalog: protectedProcedure
        .input(z.object({
            limit: z.number().int().min(100).max(5_000).default(2_500),
        }).optional())
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 2_500;

            return ctx.prisma.item.findMany({
                where: {
                    isTradeable: true,
                    iconUrl: {
                        not: null,
                    },
                },
                select: {
                    id: true,
                    name: true,
                    iconUrl: true,
                    grade: true,
                },
                orderBy: { id: 'asc' },
                take: limit,
            });
        }),

    /** Lista o histórico OCR do usuário para auditoria no frontend */
    listOcrImportHistory: protectedProcedure
        .input(z.object({
            limit: z.number().int().min(1).max(50).default(20),
            cursor: z.number().int().positive().optional(),
            search: z.string().trim().min(1).max(120).optional(),
            selectionSource: z.enum(INVENTORY_SCREENSHOT_IMPORT_SELECTION_SOURCES).optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const importedItemsWhere = buildOcrHistoryImportedItemsWhere({
                search: input?.search,
                selectionSource: input?.selectionSource,
            });
            const hasImportedItemsFilter = Object.keys(importedItemsWhere).length > 0;
            const batches = await ctx.prisma.inventoryOcrImportBatch.findMany({
                where: {
                    userId: ctx.session.userId,
                    ...(hasImportedItemsFilter
                        ? {
                            importedItems: {
                                some: importedItemsWhere,
                            },
                        }
                        : {}),
                },
                include: {
                    importedItems: {
                        ...(hasImportedItemsFilter
                            ? {
                                where: importedItemsWhere,
                            }
                            : {}),
                        include: {
                            selectedItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    iconUrl: true,
                                },
                            },
                        },
                        orderBy: { id: 'asc' },
                    },
                },
                ...(input?.cursor
                    ? {
                        cursor: { id: input.cursor },
                        skip: 1,
                    }
                    : {}),
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: limit + 1,
            });

            const hasMore = batches.length > limit;
            const pageBatches = hasMore ? batches.slice(0, limit) : batches;

            return {
                items: pageBatches.map((batch) => ({
                    id: batch.id,
                    ocrTexts: normalizeOcrTexts(batch.ocrTexts),
                    importedRowCount: batch.importedRowCount,
                    importedQuantityTotal: batch.importedQuantityTotal,
                    createdAt: batch.createdAt,
                    importedItems: batch.importedItems.map((item) => ({
                        id: item.id,
                        rawName: item.rawName,
                        originalQuantity: item.originalQuantity,
                        confirmedQuantity: item.confirmedQuantity,
                        score: item.score,
                        selectionSource: item.selectionSource,
                        selectedItem: item.selectedItem,
                    })),
                })),
                nextCursor: hasMore ? pageBatches[pageBatches.length - 1]?.id : undefined,
                hasMore,
            };
        }),

    /** Importa linhas revisadas do OCR e registra histórico do lote no backend */
    importFromScreenshot: protectedProcedure
        .input(z.object({
            ocrTexts: z.array(z.string().trim().min(1).max(100_000)).min(1).max(12),
            items: z.array(z.object({
                rawName: z.string().trim().min(2).max(120),
                originalQuantity: z.number().int().min(1).max(999_999_999),
                confirmedQuantity: z.number().int().min(1).max(999_999_999),
                selectedItemId: z.number().int().positive(),
                score: z.number().min(0).max(1),
                selectionSource: z.enum(INVENTORY_SCREENSHOT_IMPORT_SELECTION_SOURCES),
            })).min(1).max(500),
        }))
        .mutation(async ({ ctx, input }) => {
            const uniqueItemIds = Array.from(new Set(input.items.map((item) => item.selectedItemId)));
            const existingItems = await ctx.prisma.item.findMany({
                where: {
                    id: {
                        in: uniqueItemIds,
                    },
                },
                select: { id: true },
            });

            if (existingItems.length !== uniqueItemIds.length) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Um ou mais itens selecionados não existem mais para importação.',
                });
            }

            const inventoryItems = buildInventoryScreenshotImportInventoryItems(input.items);
            const summary = summarizeInventoryScreenshotImport(input.items);

            return ctx.prisma.$transaction(async (tx) => {
                const batch = await tx.inventoryOcrImportBatch.create({
                    data: {
                        userId: ctx.session.userId,
                        ocrTexts: input.ocrTexts,
                        importedRowCount: summary.importedRowCount,
                        importedQuantityTotal: summary.importedQuantityTotal,
                    },
                });

                await tx.inventoryOcrImportItem.createMany({
                    data: input.items.map((item) => ({
                        batchId: batch.id,
                        selectedItemId: item.selectedItemId,
                        rawName: item.rawName,
                        originalQuantity: item.originalQuantity,
                        confirmedQuantity: item.confirmedQuantity,
                        score: item.score,
                        selectionSource: item.selectionSource,
                    })),
                });

                for (const item of inventoryItems) {
                    await tx.userInventory.upsert({
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
                    });
                }

                return {
                    batchId: batch.id,
                    importedRows: summary.importedRowCount,
                    updated: inventoryItems.length,
                };
            });
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

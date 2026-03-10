import { Role } from '@bdo/db';
import { describe, expect, it, vi } from 'vitest';
import { inventoryRouter } from './inventory';

const session = {
    userId: 42,
    username: 'Black',
    role: Role.USER,
} as const;

function createCaller(prisma: Record<string, unknown>) {
    return inventoryRouter.createCaller({
        prisma: prisma as never,
        session,
    });
}

describe('inventoryRouter', () => {
    it('lista catálogo visual com itens tradeable e ícone', async () => {
        const findMany = vi.fn().mockResolvedValue([
            { id: 5401, name: 'Açúcar', iconUrl: '/item/5401', grade: 0 },
            { id: 5402, name: 'Açúcar Mascavo', iconUrl: '/item/5402', grade: 1 },
        ]);

        const caller = createCaller({
            item: {
                findMany,
            },
        });

        const result = await caller.listImportCatalog({ limit: 500 });

        expect(findMany).toHaveBeenCalledWith({
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
            take: 500,
        });
        expect(result).toEqual([
            { id: 5401, name: 'Açúcar', iconUrl: '/item/5401', grade: 0 },
            { id: 5402, name: 'Açúcar Mascavo', iconUrl: '/item/5402', grade: 1 },
        ]);
    });

    it('lista o histórico OCR do usuário com textos normalizados', async () => {
        const findMany = vi.fn().mockResolvedValue([
            {
                id: 9,
                ocrTexts: ['Açúcar 120', '', 15],
                importedRowCount: 2,
                importedQuantityTotal: 150,
                createdAt: new Date('2026-03-09T18:00:00.000Z'),
                importedItems: [
                    {
                        id: 1,
                        rawName: 'Acucar',
                        originalQuantity: 120,
                        confirmedQuantity: 120,
                        score: 1,
                        selectionSource: 'ocr',
                        selectedItem: {
                            id: 5401,
                            name: 'Açúcar',
                            iconUrl: '/item/5401',
                        },
                    },
                ],
            },
        ]);

        const caller = createCaller({
            inventoryOcrImportBatch: {
                findMany,
            },
        });

        const result = await caller.listOcrImportHistory();

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 42 },
            take: 21,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }));
        expect(result).toEqual({
            items: [
                expect.objectContaining({
                    id: 9,
                    ocrTexts: ['Açúcar 120'],
                    importedRowCount: 2,
                    importedQuantityTotal: 150,
                    importedItems: [
                        expect.objectContaining({
                            rawName: 'Acucar',
                            selectedItem: expect.objectContaining({ name: 'Açúcar' }),
                        }),
                    ],
                }),
            ],
            nextCursor: undefined,
            hasMore: false,
        });
    });

    it('aplica paginação e filtros no histórico OCR', async () => {
        const findMany = vi.fn().mockResolvedValue([
            {
                id: 80,
                ocrTexts: ['Acucar 12'],
                importedRowCount: 1,
                importedQuantityTotal: 12,
                createdAt: new Date('2026-03-09T18:00:00.000Z'),
                importedItems: [
                    {
                        id: 1,
                        rawName: 'Acucar',
                        originalQuantity: 12,
                        confirmedQuantity: 12,
                        score: 0.95,
                        selectionSource: 'manual',
                        selectedItem: {
                            id: 5401,
                            name: 'Açúcar',
                            iconUrl: null,
                        },
                    },
                ],
            },
            {
                id: 79,
                ocrTexts: ['Acucar mascavo 5'],
                importedRowCount: 1,
                importedQuantityTotal: 5,
                createdAt: new Date('2026-03-09T17:00:00.000Z'),
                importedItems: [
                    {
                        id: 2,
                        rawName: 'Acucar mascavo',
                        originalQuantity: 5,
                        confirmedQuantity: 5,
                        score: 0.92,
                        selectionSource: 'manual',
                        selectedItem: {
                            id: 5402,
                            name: 'Açúcar Mascavo',
                            iconUrl: null,
                        },
                    },
                ],
            },
        ]);

        const caller = createCaller({
            inventoryOcrImportBatch: {
                findMany,
            },
        });

        const result = await caller.listOcrImportHistory({
            limit: 1,
            cursor: 91,
            search: 'acu',
            selectionSource: 'manual',
        });

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            cursor: { id: 91 },
            skip: 1,
            take: 2,
            where: {
                userId: 42,
                importedItems: {
                    some: {
                        selectionSource: 'manual',
                        OR: [
                            {
                                rawName: {
                                    contains: 'acu',
                                    mode: 'insensitive',
                                },
                            },
                            {
                                selectedItem: {
                                    is: {
                                        name: {
                                            contains: 'acu',
                                            mode: 'insensitive',
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            include: {
                importedItems: {
                    where: {
                        selectionSource: 'manual',
                        OR: [
                            {
                                rawName: {
                                    contains: 'acu',
                                    mode: 'insensitive',
                                },
                            },
                            {
                                selectedItem: {
                                    is: {
                                        name: {
                                            contains: 'acu',
                                            mode: 'insensitive',
                                        },
                                    },
                                },
                            },
                        ],
                    },
                    include: expect.any(Object),
                    orderBy: { id: 'asc' },
                },
            },
        }));
        expect(result).toEqual({
            items: [
                expect.objectContaining({
                    id: 80,
                    importedItems: [
                        expect.objectContaining({
                            selectionSource: 'manual',
                        }),
                    ],
                }),
            ],
            nextCursor: 80,
            hasMore: true,
        });
    });

    it('bloqueia importação quando algum item selecionado não existe mais', async () => {
        const prisma = {
            item: {
                findMany: vi.fn().mockResolvedValue([{ id: 5401 }]),
            },
            $transaction: vi.fn(),
        };

        const caller = createCaller(prisma);

        await expect(caller.importFromScreenshot({
            ocrTexts: ['Açúcar 120'],
            items: [
                {
                    rawName: 'Acucar',
                    originalQuantity: 120,
                    confirmedQuantity: 120,
                    selectedItemId: 5401,
                    score: 1,
                    selectionSource: 'ocr',
                },
                {
                    rawName: 'Farinha',
                    originalQuantity: 30,
                    confirmedQuantity: 30,
                    selectedItemId: 5402,
                    score: 0.94,
                    selectionSource: 'manual',
                },
            ],
        })).rejects.toThrow('Um ou mais itens selecionados não existem mais para importação.');

        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persiste o lote OCR e consolida os itens importados no inventário', async () => {
        const batchCreate = vi.fn().mockResolvedValue({ id: 77 });
        const itemsCreateMany = vi.fn().mockResolvedValue({ count: 3 });
        const inventoryUpsert = vi.fn().mockResolvedValue({});
        const tx = {
            inventoryOcrImportBatch: {
                create: batchCreate,
            },
            inventoryOcrImportItem: {
                createMany: itemsCreateMany,
            },
            userInventory: {
                upsert: inventoryUpsert,
            },
        };

        const prisma = {
            item: {
                findMany: vi.fn().mockResolvedValue([{ id: 5401 }, { id: 5402 }]),
            },
            $transaction: vi.fn(async (callback: (input: typeof tx) => Promise<unknown>) => callback(tx)),
        };

        const caller = createCaller(prisma);

        const result = await caller.importFromScreenshot({
            ocrTexts: ['Açúcar 120', 'Farinha 30'],
            items: [
                {
                    rawName: 'Acucar',
                    originalQuantity: 120,
                    confirmedQuantity: 120,
                    selectedItemId: 5401,
                    score: 1,
                    selectionSource: 'ocr',
                },
                {
                    rawName: 'Acucar Mascavo',
                    originalQuantity: 10,
                    confirmedQuantity: 5,
                    selectedItemId: 5401,
                    score: 0.91,
                    selectionSource: 'manual',
                },
                {
                    rawName: 'Farinha',
                    originalQuantity: 30,
                    confirmedQuantity: 30,
                    selectedItemId: 5402,
                    score: 0.95,
                    selectionSource: 'auto',
                },
            ],
        });

        expect(batchCreate).toHaveBeenCalledWith({
            data: {
                userId: 42,
                ocrTexts: ['Açúcar 120', 'Farinha 30'],
                importedRowCount: 3,
                importedQuantityTotal: 155,
            },
        });
        expect(itemsCreateMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ batchId: 77, selectedItemId: 5401, rawName: 'Acucar' }),
                expect.objectContaining({ batchId: 77, selectedItemId: 5402, rawName: 'Farinha' }),
            ]),
        });
        expect(inventoryUpsert).toHaveBeenNthCalledWith(1, {
            where: {
                userId_itemId: {
                    userId: 42,
                    itemId: 5401,
                },
            },
            create: {
                userId: 42,
                itemId: 5401,
                quantity: 125,
            },
            update: {
                quantity: 125,
            },
        });
        expect(inventoryUpsert).toHaveBeenNthCalledWith(2, {
            where: {
                userId_itemId: {
                    userId: 42,
                    itemId: 5402,
                },
            },
            create: {
                userId: 42,
                itemId: 5402,
                quantity: 30,
            },
            update: {
                quantity: 30,
            },
        });
        expect(result).toEqual({
            batchId: 77,
            importedRows: 3,
            updated: 2,
        });
    });
});
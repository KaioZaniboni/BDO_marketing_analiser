import type { PrismaClient } from '@bdo/db';
import type { SupportedRecipeType } from './recipe-classification';

const SUPPORT_ITEM_IDS_BY_TYPE: Record<SupportedRecipeType, number[]> = {
    cooking: [9061, 9062, 9063, 9065, 9213, 9780],
    alchemy: [4801, 4802, 4803, 4804, 4805, 5301, 9733, 9781],
    processing: [],
};

export function getCraftingSupportItemIds(types: SupportedRecipeType[]): number[] {
    return Array.from(new Set(types.flatMap((type) => SUPPORT_ITEM_IDS_BY_TYPE[type] ?? [])));
}

export async function listCraftingSupportItems(prisma: PrismaClient, types: SupportedRecipeType[]) {
    const itemIds = getCraftingSupportItemIds(types);
    if (itemIds.length === 0) {
        return [];
    }

    return prisma.item.findMany({
        where: { id: { in: itemIds } },
        include: {
            prices: { where: { enhancementLevel: 0 }, take: 1 },
        },
        orderBy: { id: 'asc' },
    });
}

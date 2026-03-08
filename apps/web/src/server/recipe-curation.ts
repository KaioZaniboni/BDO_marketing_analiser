import 'server-only';
import {
    Prisma,
    prisma,
    loadRecipeCurations,
    mergeRecipeCurations,
    normalizeRecipeCurationRecord,
    type RecipeCurationRecord,
    type RecipeCurationSource,
} from '@bdo/db';
import {
    buildRecipeCurationDraft,
    normalizeRecipeCurationSearchTerm,
    normalizeRecipeCurationTypeFilter,
    serializeRecipeCurationDraft,
    type RecipeCurationTypeFilter,
} from '@/lib/recipe-curation';

const CURATION_FILE_DISPLAY_PATH = 'packages/db/src/seed-data/recipe-curations.json';

const recipeCurationCraftArgs = Prisma.validator<Prisma.CraftingRecipeCraftDefaultArgs>()({
    include: {
        resultItem: true,
        slots: {
            include: {
                options: {
                    include: { item: true },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        },
        variants: {
            include: {
                slotSelections: {
                    select: {
                        slotId: true,
                        slotOptionId: true,
                    },
                },
            },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
    },
});

export type RecipeCurationCraft = Prisma.CraftingRecipeCraftGetPayload<typeof recipeCurationCraftArgs>;

export interface RecipeCurationPageData {
    crafts: RecipeCurationCraft[];
    currentCuration: RecipeCurationRecord | null;
    currentCurationSource: RecipeCurationSource | 'seed' | null;
    dbCuration: RecipeCurationRecord | null;
    dbCuratedCraftCount: number;
    curationFileDisplayPath: string;
    draftJson: string | null;
    effectiveCuratedCraftCount: number;
    jsonCuration: RecipeCurationRecord | null;
    jsonCuratedCraftCount: number;
    loadError: string | null;
    recentAudits: Array<{
        id: number;
        action: string;
        actorUsername: string | null;
        createdAt: Date;
    }>;
    searchTerm: string;
    selectedCraft: RecipeCurationCraft | null;
    totalCount: number;
    typeFilter: RecipeCurationTypeFilter;
}

function normalizePositiveInteger(value: string | string[] | undefined) {
    const parsed = Number(Array.isArray(value) ? value[0] : value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const recipeCurationRecordArgs = Prisma.validator<Prisma.RecipeCurationDefaultArgs>()({
    include: {
        slots: {
            orderBy: { slotIndex: 'asc' },
        },
    },
});

type RecipeCurationRow = Prisma.RecipeCurationGetPayload<typeof recipeCurationRecordArgs>;

function toRecipeCurationRecord(row: RecipeCurationRow | null): RecipeCurationRecord | null {
    return normalizeRecipeCurationRecord(row ? {
        canonicalKey: row.canonicalKey,
        legacyRecipeIds: row.legacyRecipeIds,
        primaryLegacyRecipeId: row.primaryLegacyRecipeId,
        nameOverride: row.nameOverride,
        notes: row.notes,
        slots: row.slots.map((slot) => ({
            index: slot.slotIndex,
            slotKey: slot.slotKey,
            label: slot.label,
            defaultItemId: slot.defaultItemId,
            defaultQuantity: slot.defaultQuantity,
        })),
    } : null);
}

export async function getRecipeCurationPageData(
    rawFilters: Record<string, string | string[] | undefined>,
): Promise<RecipeCurationPageData> {
    const typeFilter = normalizeRecipeCurationTypeFilter(rawFilters.type);
    const searchTerm = normalizeRecipeCurationSearchTerm(rawFilters.q);
    const selectedCraftId = normalizePositiveInteger(rawFilters.craftId);
    const numericSearch = Number(searchTerm);
    const jsonDocument = loadRecipeCurations();
    const where: Prisma.CraftingRecipeCraftWhereInput = {
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
        ...(searchTerm
            ? {
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { canonicalKey: { contains: searchTerm, mode: 'insensitive' } },
                    { variants: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } },
                    ...(Number.isInteger(numericSearch) && numericSearch > 0 ? [{ resultItemId: numericSearch }] : []),
                ],
            }
            : {}),
    };

    try {
        const [crafts, totalCount, dbCurationRows] = await Promise.all([
            prisma.craftingRecipeCraft.findMany({
                ...recipeCurationCraftArgs,
                where,
                orderBy: [{ type: 'asc' }, { name: 'asc' }],
                take: 40,
            }),
            prisma.craftingRecipeCraft.count({ where }),
            prisma.recipeCuration.findMany(recipeCurationRecordArgs),
        ]);

        const selectedCraft = crafts.find((craft) => craft.id === selectedCraftId) ?? crafts[0] ?? null;
        const dbRecords = dbCurationRows
            .map((row) => toRecipeCurationRecord(row))
            .filter((record): record is RecipeCurationRecord => Boolean(record));
        const mergedCurations = mergeRecipeCurations({
            jsonRecords: jsonDocument.crafts,
            dbRecords,
        });
        const currentCuration = selectedCraft
            ? mergedCurations.effectiveByCanonicalKey.get(selectedCraft.canonicalKey) ?? null
            : null;
        const jsonCuration = selectedCraft
            ? mergedCurations.jsonByCanonicalKey.get(selectedCraft.canonicalKey) ?? null
            : null;
        const dbCuration = selectedCraft
            ? mergedCurations.dbByCanonicalKey.get(selectedCraft.canonicalKey) ?? null
            : null;
        const currentCurationSource = selectedCraft
            ? mergedCurations.sourceByCanonicalKey.get(selectedCraft.canonicalKey) ?? 'seed'
            : null;
        const draftJson = selectedCraft
            ? serializeRecipeCurationDraft(buildRecipeCurationDraft({
                canonicalKey: selectedCraft.canonicalKey,
                craftName: selectedCraft.name,
                variants: selectedCraft.variants.map((variant) => ({
                    legacyRecipeId: variant.legacyRecipeId,
                    isPrimary: variant.isPrimary,
                })),
                slots: selectedCraft.slots.map((slot) => ({
                    sortOrder: slot.sortOrder,
                    slotKey: slot.slotKey,
                    label: slot.label,
                    options: slot.options.map((option) => ({
                        itemId: option.itemId,
                        quantity: option.quantity,
                        isDefault: option.isDefault,
                    })),
                })),
                currentCuration,
            }))
            : null;
        const selectedDbCurationRow = selectedCraft
            ? dbCurationRows.find((row) => row.canonicalKey === selectedCraft.canonicalKey) ?? null
            : null;
        const recentAudits = selectedDbCurationRow
            ? await prisma.recipeCurationAudit.findMany({
                where: { curationId: selectedDbCurationRow.id },
                orderBy: { createdAt: 'desc' },
                take: 8,
                select: {
                    id: true,
                    action: true,
                    createdAt: true,
                    actorUser: { select: { username: true } },
                },
            })
            : [];

        return {
            crafts,
            currentCuration,
            currentCurationSource,
            dbCuration,
            dbCuratedCraftCount: mergedCurations.dbByCanonicalKey.size,
            curationFileDisplayPath: CURATION_FILE_DISPLAY_PATH,
            draftJson,
            effectiveCuratedCraftCount: mergedCurations.effectiveByCanonicalKey.size,
            jsonCuration,
            jsonCuratedCraftCount: mergedCurations.jsonByCanonicalKey.size,
            loadError: null,
            recentAudits: recentAudits.map((audit) => ({
                id: audit.id,
                action: audit.action,
                actorUsername: audit.actorUser?.username ?? null,
                createdAt: audit.createdAt,
            })),
            searchTerm,
            selectedCraft,
            totalCount,
            typeFilter,
        };
    } catch (error) {
        return {
            crafts: [],
            currentCuration: null,
            currentCurationSource: null,
            dbCuration: null,
            dbCuratedCraftCount: 0,
            curationFileDisplayPath: CURATION_FILE_DISPLAY_PATH,
            draftJson: null,
            effectiveCuratedCraftCount: jsonDocument.crafts.length,
            jsonCuration: null,
            jsonCuratedCraftCount: jsonDocument.crafts.length,
            loadError: error instanceof Error ? error.message : 'Falha ao carregar crafts canônicos.',
            recentAudits: [],
            searchTerm,
            selectedCraft: null,
            totalCount: 0,
            typeFilter,
        };
    }
}
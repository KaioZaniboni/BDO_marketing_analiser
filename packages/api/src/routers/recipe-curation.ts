import { TRPCError } from '@trpc/server';
import {
    Prisma,
    buildCanonicalCrafts,
    loadRecipeCurations,
    normalizeRecipeCurationRecord,
    parseRecipeCurationDraft,
    replaceMaterializedCanonicalCraft,
    type RecipeCurationRecord,
} from '@bdo/db';
import { z } from 'zod';
import { normalizeRecipeType } from '../services/recipe-classification';
import { adminProcedure, router } from '../trpc';

const legacyRecipeArgs = Prisma.validator<Prisma.RecipeDefaultArgs>()({
    include: {
        ingredients: {
            orderBy: { sortOrder: 'asc' },
        },
    },
});

const persistedRecipeCurationArgs = Prisma.validator<Prisma.RecipeCurationDefaultArgs>()({
    include: {
        slots: {
            orderBy: { slotIndex: 'asc' },
        },
    },
});

type PersistedRecipeCuration = Prisma.RecipeCurationGetPayload<typeof persistedRecipeCurationArgs>;

function toSortedUniquePositiveIds(values: Array<number | null | undefined>) {
    return Array.from(new Set(
        values.filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
    )).sort((left, right) => left - right);
}

function haveSameRecipeIds(left: number[], right: number[]) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function toRecipeCurationRecord(curation: PersistedRecipeCuration | null): RecipeCurationRecord | null {
    return normalizeRecipeCurationRecord(curation ? {
        canonicalKey: curation.canonicalKey,
        legacyRecipeIds: curation.legacyRecipeIds,
        primaryLegacyRecipeId: curation.primaryLegacyRecipeId,
        nameOverride: curation.nameOverride,
        notes: curation.notes,
        slots: curation.slots.map((slot) => ({
            index: slot.slotIndex,
            slotKey: slot.slotKey,
            label: slot.label,
            defaultItemId: slot.defaultItemId,
            defaultQuantity: slot.defaultQuantity,
        })),
    } : null);
}

function toAuditJsonValue(record: RecipeCurationRecord | null): Prisma.InputJsonValue | null {
    return record ? JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue : null;
}

export const recipeCurationRouter = router({
    save: adminProcedure
        .input(z.object({
            selectedCanonicalKey: z.string().trim().min(1),
            draftJson: z.string().trim().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const draft = parseRecipeCurationDraft(input.draftJson);

            if (draft.canonicalKey !== input.selectedCanonicalKey) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'O canonicalKey do draft precisa corresponder ao craft selecionado.',
                });
            }

            const jsonDocument = loadRecipeCurations();

            return ctx.prisma.$transaction(async (tx) => {
                const selectedCraft = await tx.craftingRecipeCraft.findUnique({
                    where: { canonicalKey: input.selectedCanonicalKey },
                    select: {
                        canonicalKey: true,
                        type: true,
                        resultItemId: true,
                        variants: {
                            where: { legacyRecipeId: { not: null } },
                            select: { legacyRecipeId: true },
                            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                        },
                    },
                });

                if (!selectedCraft) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Craft canônico selecionado não encontrado.' });
                }

                const currentLegacyRecipeIds = toSortedUniquePositiveIds(
                    selectedCraft.variants.map((variant) => variant.legacyRecipeId),
                );

                if (!haveSameRecipeIds(currentLegacyRecipeIds, draft.legacyRecipeIds)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Nesta etapa, o save operacional preserva exatamente os legacyRecipeIds já vinculados ao craft selecionado.',
                    });
                }

                const rawLegacyRecipes = await tx.recipe.findMany({
                    ...legacyRecipeArgs,
                    where: { id: { in: currentLegacyRecipeIds } },
                    orderBy: { id: 'asc' },
                });

                if (rawLegacyRecipes.length !== currentLegacyRecipeIds.length) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Um ou mais legacyRecipeIds não existem mais no catálogo legado.' });
                }

                const legacyRecipes = rawLegacyRecipes.map((recipe) => normalizeRecipeType(recipe));
                if (legacyRecipes.some((recipe) => recipe.type !== selectedCraft.type || recipe.resultItemId !== selectedCraft.resultItemId)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Os legacyRecipeIds informados não pertencem ao craft selecionado na visão canônica atual.',
                    });
                }

                const ingredientItemIds = Array.from(new Set(
                    legacyRecipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.itemId)),
                ));
                const items = ingredientItemIds.length > 0
                    ? await tx.item.findMany({ where: { id: { in: ingredientItemIds } }, select: { id: true, name: true } })
                    : [];
                const itemNamesById = new Map(items.map((item) => [item.id, item.name] as const));

                const existingCuration = await tx.recipeCuration.findUnique({
                    ...persistedRecipeCurationArgs,
                    where: { canonicalKey: input.selectedCanonicalKey },
                });

                const slotCreates = draft.slots.map((slot) => ({
                    slotIndex: slot.index,
                    slotKey: slot.slotKey,
                    label: slot.label,
                    defaultItemId: slot.defaultItemId,
                    defaultQuantity: slot.defaultQuantity,
                }));

                const persistedCuration = existingCuration
                    ? await tx.recipeCuration.update({
                        ...persistedRecipeCurationArgs,
                        where: { id: existingCuration.id },
                        data: {
                            legacyRecipeIds: draft.legacyRecipeIds,
                            primaryLegacyRecipeId: draft.primaryLegacyRecipeId,
                            nameOverride: draft.nameOverride,
                            notes: draft.notes,
                            updatedByUserId: ctx.session.userId,
                            slots: {
                                deleteMany: {},
                                create: slotCreates,
                            },
                        },
                    })
                    : await tx.recipeCuration.create({
                        ...persistedRecipeCurationArgs,
                        data: {
                            canonicalKey: draft.canonicalKey,
                            legacyRecipeIds: draft.legacyRecipeIds,
                            primaryLegacyRecipeId: draft.primaryLegacyRecipeId,
                            nameOverride: draft.nameOverride,
                            notes: draft.notes,
                            updatedByUserId: ctx.session.userId,
                            slots: {
                                create: slotCreates,
                            },
                        },
                    });

                const persistedRecord = toRecipeCurationRecord(persistedCuration);
                const canonicalCraft = buildCanonicalCrafts(legacyRecipes, itemNamesById, {
                    jsonDocument,
                    dbCurations: persistedRecord ? [persistedRecord] : [],
                    curationVersion: jsonDocument.version,
                })[0];

                if (!canonicalCraft) {
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao rematerializar o craft canônico selecionado.' });
                }

                await replaceMaterializedCanonicalCraft(tx, canonicalCraft);
                const auditPayload: Prisma.InputJsonObject = {
                    selectedCanonicalKey: input.selectedCanonicalKey,
                    before: toAuditJsonValue(toRecipeCurationRecord(existingCuration)),
                    after: toAuditJsonValue(persistedRecord),
                    republishedLegacyRecipeIds: currentLegacyRecipeIds,
                };

                await tx.recipeCurationAudit.create({
                    data: {
                        curationId: persistedCuration.id,
                        actorUserId: ctx.session.userId,
                        action: existingCuration ? 'update' : 'create',
                        payload: auditPayload,
                    },
                });

                return {
                    canonicalKey: persistedCuration.canonicalKey,
                    action: existingCuration ? 'update' : 'create',
                    updatedAt: persistedCuration.updatedAt,
                };
            });
        }),
});
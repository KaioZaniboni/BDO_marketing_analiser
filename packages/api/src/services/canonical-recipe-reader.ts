import type { PrismaClient } from '@bdo/db';
import { buildIngredientAlternativesBySlot, type IngredientAlternativeWithSubRecipe, type SubRecipeReference } from './recipe-alternatives';
import { compareRecipesByTypeNameId, filterRecipesByTypes, type SupportedRecipeType } from './recipe-classification';

const CANONICAL_UNAVAILABLE_MESSAGE = 'Leitura canônica de receitas indisponível. Execute a materialização canônica antes de usar o runtime.';

type SnapshotPrice = {
    basePrice: bigint;
    lastSoldPrice: bigint | null;
    currentStock?: number;
    totalTrades?: bigint;
    priceMin?: bigint | null;
    priceMax?: bigint | null;
};

type RecipeItem = {
    id: number;
    name: string;
    categoryId: number | null;
    subCategoryId: number | null;
    weight: number;
    grade: number;
    isTradeable: boolean;
    iconUrl: string | null;
    prices: SnapshotPrice[];
    priceHistory?: Array<{ price: bigint; volume: number; recordedDate: Date }>;
};

type CanonicalSlotOptionRecord = {
    itemId: number;
    quantity: number;
    sortOrder: number;
    item: RecipeItem;
};

type CanonicalSlotRecord = {
    sortOrder: number;
    options: CanonicalSlotOptionRecord[];
};

type CanonicalSelectionRecord = {
    sortOrder: number;
    slot: { sortOrder: number };
    slotOption: CanonicalSlotOptionRecord;
};

type CanonicalVariantRecord = {
    legacyRecipeId: number | null;
    name: string;
    type: string;
    resultItemId: number;
    resultQuantity: number;
    procItemId: number | null;
    procQuantity: number | null;
    masteryBonusPct: number;
    experience: number;
    cookTimeSeconds: number;
    categoryId: number | null;
    resultItem: RecipeItem;
    procItem: RecipeItem | null;
    craft?: {
        name: string;
        slots?: CanonicalSlotRecord[];
    };
    slotSelections: CanonicalSelectionRecord[];
};

export interface CanonicalReadableRecipe {
    id: number;
    name: string;
    type: string;
    resultItemId: number;
    resultQuantity: number;
    procItemId: number | null;
    procQuantity: number | null;
    masteryBonusPct: number;
    experience: number;
    cookTimeSeconds: number;
    categoryId: number | null;
    resultItem: RecipeItem;
    procItem: RecipeItem | null;
    ingredients: Array<{
        itemId: number;
        quantity: number;
        sortOrder: number;
        item: RecipeItem;
    }>;
}

export interface CanonicalRecipeDetail {
    recipe: CanonicalReadableRecipe;
    ingredientAlternatives: Record<number, IngredientAlternativeWithSubRecipe<CanonicalReadableRecipe['ingredients'][number], string>[]>;
    treeRecipes: CanonicalReadableRecipe[];
}

export class CanonicalRecipesUnavailableError extends Error {
    constructor(message: string = CANONICAL_UNAVAILABLE_MESSAGE) {
        super(message);
        this.name = 'CanonicalRecipesUnavailableError';
    }
}

export function isCanonicalRecipesUnavailableError(error: unknown): error is CanonicalRecipesUnavailableError {
    return error instanceof CanonicalRecipesUnavailableError;
}

function isCanonicalUnavailableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

    return code === 'P2021'
        || code === 'P2022'
        || /crafting_recipe_(crafts|variants|slots|slot_options|variant_slot_selections)/i.test(message);
}

async function hasCanonicalData(prisma: PrismaClient): Promise<boolean> {
    const row = await prisma.craftingRecipeVariant.findFirst({ select: { id: true } });
    return Boolean(row);
}

async function assertCanonicalDataAvailable(prisma: PrismaClient): Promise<void> {
    try {
        if (!(await hasCanonicalData(prisma))) {
            throw new CanonicalRecipesUnavailableError();
        }
    } catch (error) {
        if (isCanonicalUnavailableError(error)) {
            throw new CanonicalRecipesUnavailableError();
        }
        throw error;
    }
}

function sortSelections(left: CanonicalSelectionRecord, right: CanonicalSelectionRecord): number {
    return left.slot.sortOrder - right.slot.sortOrder || left.sortOrder - right.sortOrder;
}

function buildSubRecipeMap(recipes: CanonicalReadableRecipe[]): Map<number, SubRecipeReference<string>> {
    const sortedRecipes = [...recipes].sort(compareRecipesByTypeNameId);
    const lookup = new Map<number, SubRecipeReference<string>>();

    for (const recipe of sortedRecipes) {
        if (!lookup.has(recipe.resultItemId)) {
            lookup.set(recipe.resultItemId, { id: recipe.id, type: recipe.type });
        }
    }

    return lookup;
}

function normalizeRecipes(recipes: CanonicalReadableRecipe[], types?: SupportedRecipeType[]): CanonicalReadableRecipe[] {
    return filterRecipesByTypes(recipes, types) as CanonicalReadableRecipe[];
}

export function mapCanonicalVariantToRecipe(variant: CanonicalVariantRecord): CanonicalReadableRecipe | null {
    if (variant.legacyRecipeId == null) {
        return null;
    }

    const selections = [...variant.slotSelections].sort(sortSelections);

    return {
        id: variant.legacyRecipeId,
        name: variant.craft?.name ?? variant.name,
        type: variant.type,
        resultItemId: variant.resultItemId,
        resultQuantity: Number(variant.resultQuantity ?? 1),
        procItemId: variant.procItemId,
        procQuantity: variant.procQuantity == null ? null : Number(variant.procQuantity),
        masteryBonusPct: Number(variant.masteryBonusPct ?? 0),
        experience: Number(variant.experience ?? 0),
        cookTimeSeconds: Number(variant.cookTimeSeconds ?? 0),
        categoryId: variant.categoryId,
        resultItem: variant.resultItem,
        procItem: variant.procItem,
        ingredients: selections.map((selection) => ({
            itemId: selection.slotOption.itemId,
            quantity: selection.slotOption.quantity,
            sortOrder: selection.slot.sortOrder,
            item: selection.slotOption.item,
        })),
    };
}

export function buildCanonicalIngredientAlternatives(
    slots: CanonicalSlotRecord[],
    selections: CanonicalSelectionRecord[],
    getSubRecipe: (itemId: number) => SubRecipeReference<string> | null | undefined,
): CanonicalRecipeDetail['ingredientAlternatives'] {
    const selectedBySlot = new Map<number, CanonicalSelectionRecord>(
        selections.map((selection) => [selection.slot.sortOrder, selection]),
    );
    const ingredientAlternatives: CanonicalRecipeDetail['ingredientAlternatives'] = {};

    [...slots]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .forEach((slot, index) => {
            const selected = selectedBySlot.get(slot.sortOrder);
            const options = [...slot.options].sort((left, right) => {
                const leftSelected = selected
                    && left.itemId === selected.slotOption.itemId
                    && left.quantity === selected.slotOption.quantity;
                const rightSelected = selected
                    && right.itemId === selected.slotOption.itemId
                    && right.quantity === selected.slotOption.quantity;

                if (leftSelected) return -1;
                if (rightSelected) return 1;
                return left.sortOrder - right.sortOrder || left.itemId - right.itemId || left.quantity - right.quantity;
            });

            ingredientAlternatives[index] = options.map((option) => {
                const subRecipe = getSubRecipe(option.itemId);
                return {
                    itemId: option.itemId,
                    quantity: option.quantity,
                    sortOrder: slot.sortOrder,
                    item: option.item,
                    subRecipeId: subRecipe?.id ?? null,
                    subRecipeType: subRecipe?.type ?? null,
                };
            });
        });

    return ingredientAlternatives;
}

async function fetchCanonicalVariantsByResultItemIds(prisma: PrismaClient, resultItemIds: number[]) {
    return prisma.craftingRecipeVariant.findMany({
        where: {
            legacyRecipeId: { not: null },
            resultItemId: { in: resultItemIds },
        },
        include: {
            craft: { select: { name: true } },
            resultItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
            procItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
            slotSelections: {
                include: {
                    slot: true,
                    slotOption: {
                        include: {
                            item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                        },
                    },
                },
                orderBy: [{ sortOrder: 'asc' }],
            },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
}

export async function listCanonicalRecipes(
    prisma: PrismaClient,
    input: { type?: SupportedRecipeType; limit: number; offset: number; search?: string },
): Promise<CanonicalReadableRecipe[]> {
    await assertCanonicalDataAvailable(prisma);

    const variants = await prisma.craftingRecipeVariant.findMany({
        where: { isPrimary: true, legacyRecipeId: { not: null } },
        include: {
            craft: { select: { name: true } },
            resultItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
            procItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
            slotSelections: {
                include: {
                    slot: true,
                    slotOption: {
                        include: {
                            item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                        },
                    },
                },
                orderBy: [{ sortOrder: 'asc' }],
            },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    let recipes = normalizeRecipes(variants.map(mapCanonicalVariantToRecipe).filter(Boolean) as CanonicalReadableRecipe[], input.type ? [input.type] : undefined);
    if (input.search) {
        const term = input.search.trim().toLowerCase();
        recipes = recipes.filter((recipe) => recipe.name.toLowerCase().includes(term));
    }

    return recipes
        .sort(compareRecipesByTypeNameId)
        .slice(input.offset, input.offset + input.limit);
}

export async function catalogCanonicalRecipes(
    prisma: PrismaClient,
    input: { types?: SupportedRecipeType[]; historyDays: number; primaryOnly?: boolean },
): Promise<CanonicalReadableRecipe[]> {
    await assertCanonicalDataAvailable(prisma);

    const variants = await prisma.craftingRecipeVariant.findMany({
        where: {
            legacyRecipeId: { not: null },
            ...(input.primaryOnly ? { isPrimary: true } : {}),
        },
        include: {
            craft: { select: { name: true } },
            resultItem: {
                include: {
                    prices: { where: { enhancementLevel: 0 }, take: 1 },
                    priceHistory: { where: { enhancementLevel: 0 }, take: input.historyDays, orderBy: { recordedDate: 'desc' } },
                },
            },
            procItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
            slotSelections: {
                include: {
                    slot: true,
                    slotOption: {
                        include: {
                            item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                        },
                    },
                },
                orderBy: [{ sortOrder: 'asc' }],
            },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return normalizeRecipes(
        variants.map(mapCanonicalVariantToRecipe).filter(Boolean) as CanonicalReadableRecipe[],
        input.types,
    ).sort(compareRecipesByTypeNameId);
}

export async function getCanonicalRecipeDetail(prisma: PrismaClient, recipeId: number): Promise<CanonicalRecipeDetail | null> {
    try {
        await assertCanonicalDataAvailable(prisma);

        const rootVariant = await prisma.craftingRecipeVariant.findUnique({
            where: { legacyRecipeId: recipeId },
            include: {
                craft: {
                    include: {
                        slots: {
                            include: {
                                options: {
                                    include: {
                                        item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                                    },
                                    orderBy: [{ sortOrder: 'asc' }],
                                },
                            },
                            orderBy: [{ sortOrder: 'asc' }],
                        },
                        variants: {
                            where: { legacyRecipeId: { not: null } },
                            include: {
                                craft: { select: { name: true } },
                                resultItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                                procItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                                slotSelections: {
                                    include: {
                                        slot: true,
                                        slotOption: {
                                            include: {
                                                item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                                            },
                                        },
                                    },
                                    orderBy: [{ sortOrder: 'asc' }],
                                },
                            },
                            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                        },
                    },
                },
                resultItem: {
                    include: {
                        prices: { where: { enhancementLevel: 0 }, take: 1 },
                        priceHistory: { where: { enhancementLevel: 0 }, take: 28, orderBy: { recordedDate: 'desc' } },
                    },
                },
                procItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                slotSelections: {
                    include: {
                        slot: true,
                        slotOption: {
                            include: {
                                item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                            },
                        },
                    },
                    orderBy: [{ sortOrder: 'asc' }],
                },
            },
        });

        if (!rootVariant) {
            return null;
        }

        const rootRecipe = mapCanonicalVariantToRecipe(rootVariant);
        const siblingRecipes = normalizeRecipes(
            rootVariant.craft.variants.map(mapCanonicalVariantToRecipe).filter(Boolean) as CanonicalReadableRecipe[],
        );

        if (!rootRecipe) {
            return null;
        }

        const collectedRecipes = new Map<number, CanonicalReadableRecipe>(siblingRecipes.map((recipe) => [recipe.id, recipe]));
        const pendingResultItemIds = new Set<number>(siblingRecipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.itemId)));
        const visitedResultItemIds = new Set<number>();

        while (pendingResultItemIds.size > 0) {
            const batchItemIds = Array.from(pendingResultItemIds).filter((itemId) => !visitedResultItemIds.has(itemId));
            pendingResultItemIds.clear();

            if (batchItemIds.length === 0) {
                break;
            }

            batchItemIds.forEach((itemId) => visitedResultItemIds.add(itemId));

            const canonicalRecipes = normalizeRecipes(
                (await fetchCanonicalVariantsByResultItemIds(prisma, batchItemIds))
                    .map(mapCanonicalVariantToRecipe)
                    .filter(Boolean) as CanonicalReadableRecipe[],
            );
            const coveredItemIds = new Set<number>(canonicalRecipes.map((recipe) => recipe.resultItemId));

            canonicalRecipes.forEach((recipe) => {
                collectedRecipes.set(recipe.id, recipe);
                recipe.ingredients.forEach((ingredient) => {
                    if (!visitedResultItemIds.has(ingredient.itemId)) {
                        pendingResultItemIds.add(ingredient.itemId);
                    }
                });
            });
        }

        const treeRecipes = Array.from(collectedRecipes.values()).sort(compareRecipesByTypeNameId);
        const subRecipeMap = buildSubRecipeMap(treeRecipes);
        const ingredientAlternatives = rootVariant.craft.slots.length > 0
            ? buildCanonicalIngredientAlternatives(
                rootVariant.craft.slots,
                rootVariant.slotSelections,
                (itemId) => subRecipeMap.get(itemId) ?? null,
            )
            : buildIngredientAlternativesBySlot<CanonicalReadableRecipe['ingredients'][number], CanonicalReadableRecipe, string>(
                rootRecipe,
                siblingRecipes,
                (itemId) => subRecipeMap.get(itemId) ?? null,
            );

        return {
            recipe: normalizeRecipes([rootRecipe])[0],
            ingredientAlternatives,
            treeRecipes,
        };
    } catch (error) {
        if (isCanonicalUnavailableError(error)) {
            throw new CanonicalRecipesUnavailableError();
        }
        throw error;
    }
}
import type { CraftingRecipeCraft, Prisma, PrismaClient } from '@prisma/client';
import type { RecipeCurationRecord } from './recipe-curation.js';

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

export interface CanonicalRecipeIngredient {
    itemId: number;
    quantity: number;
}

export interface CanonicalRecipeLike {
    id: number;
    name: string;
    type: string;
    resultItemId: number;
    resultQuantity?: number | null;
    procItemId?: number | null;
    procQuantity?: number | null;
    masteryBonusPct?: number | null;
    experience?: number | null;
    cookTimeSeconds?: number | null;
    categoryId?: number | null;
    ingredients: CanonicalRecipeIngredient[];
}

export interface MaterializedCanonicalCraft {
    canonicalKey: string;
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
    source: string;
    curationVersion: number;
    curationNotes: string | null;
    slots: Array<{
        slotKey: string;
        label: string | null;
        sortOrder: number;
        source: string;
        options: Array<{
            itemId: number;
            quantity: number;
            sortOrder: number;
            label: string | null;
            isDefault: boolean;
            source: string;
        }>;
    }>;
    variants: Array<{
        legacyRecipeId: number | null;
        variantKey: string;
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
        sortOrder: number;
        isPrimary: boolean;
        source: string;
        ingredients: CanonicalRecipeIngredient[];
    }>;
}

export function buildFallbackCanonicalKey(recipe: CanonicalRecipeLike): string;
export function loadRecipeCurations(): { version: number; crafts: RecipeCurationRecord[] };
export function buildCanonicalCrafts(
    recipes: CanonicalRecipeLike[],
    itemNamesById?: Map<number, string>,
    options?: {
        jsonDocument?: { version: number; crafts: RecipeCurationRecord[] };
        dbCurations?: RecipeCurationRecord[];
        curationVersion?: number;
    },
): MaterializedCanonicalCraft[];
export function materializeCanonicalCraft(
    group: { canonicalKey: string; curation?: RecipeCurationRecord | null; recipes: CanonicalRecipeLike[] },
    curationVersion: number,
    itemNamesById: Map<number, string>,
): MaterializedCanonicalCraft;
export function createMaterializedCanonicalCraft(
    prisma: PrismaDbClient,
    craft: MaterializedCanonicalCraft,
): Promise<CraftingRecipeCraft>;
export function replaceMaterializedCanonicalCraft(
    prisma: PrismaDbClient,
    craft: MaterializedCanonicalCraft,
    options?: { existingCanonicalKeys?: string[] },
): Promise<CraftingRecipeCraft>;
export function replaceAllMaterializedCanonicalCrafts(
    prisma: PrismaDbClient,
    canonicalCrafts: MaterializedCanonicalCraft[],
): Promise<CraftingRecipeCraft[]>;
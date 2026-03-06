import fs from 'node:fs';
import path from 'node:path';

export const SUPPORTED_RECIPE_TYPES = ['cooking', 'alchemy', 'processing'] as const;

export type SupportedRecipeType = (typeof SUPPORTED_RECIPE_TYPES)[number];

interface CanonicalRecipeRecord {
    id: number;
    main_category?: string | null;
}

interface RecipeWithType {
    id: number;
    type: string;
    name: string;
    resultItemId: number;
}

let canonicalTypeMap: Map<number, SupportedRecipeType> | null = null;

function isSupportedRecipeType(value: string | null | undefined): value is SupportedRecipeType {
    return SUPPORTED_RECIPE_TYPES.includes(value as SupportedRecipeType);
}

function loadCanonicalTypeMap(): Map<number, SupportedRecipeType> {
    if (canonicalTypeMap) {
        return canonicalTypeMap;
    }

    const nextMap = new Map<number, SupportedRecipeType>();
    const candidatePaths = [
        path.join(process.cwd(), 'packages', 'db', 'bdo_recipes.json'),
        path.join(process.cwd(), '..', 'packages', 'db', 'bdo_recipes.json'),
        path.join(process.cwd(), '..', '..', 'packages', 'db', 'bdo_recipes.json'),
    ];
    const filePath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));

    if (filePath) {
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const recipes = JSON.parse(rawContent) as CanonicalRecipeRecord[];

        for (const recipe of recipes) {
            if (isSupportedRecipeType(recipe.main_category)) {
                nextMap.set(recipe.id, recipe.main_category);
            }
        }
    }

    canonicalTypeMap = nextMap;
    return nextMap;
}

export function getCanonicalRecipeType(recipeId: number, fallbackType: string): string {
    return loadCanonicalTypeMap().get(recipeId) ?? fallbackType;
}

export function normalizeRecipeType<T extends { id: number; type: string }>(recipe: T): T {
    const canonicalType = getCanonicalRecipeType(recipe.id, recipe.type);
    if (canonicalType === recipe.type) {
        return recipe;
    }

    return {
        ...recipe,
        type: canonicalType,
    };
}

export function filterRecipesByTypes<T extends { id: number; type: string }>(
    recipes: T[],
    types?: SupportedRecipeType[],
): T[] {
    const normalizedRecipes = recipes.map(normalizeRecipeType);
    if (!types?.length) {
        return normalizedRecipes;
    }

    const allowedTypes = new Set(types);
    return normalizedRecipes.filter((recipe) => allowedTypes.has(recipe.type as SupportedRecipeType));
}

export function getRecipeVariantKey(recipe: RecipeWithType): string {
    return `${recipe.type}:${recipe.resultItemId}:${recipe.name.toLowerCase()}`;
}

export function compareRecipesByTypeNameId(
    left: { id: number; type: string; name: string },
    right: { id: number; type: string; name: string },
): number {
    return left.type.localeCompare(right.type)
        || left.name.localeCompare(right.name)
        || left.id - right.id;
}

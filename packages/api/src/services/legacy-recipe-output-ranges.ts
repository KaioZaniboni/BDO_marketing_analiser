import fs from 'node:fs';
import path from 'node:path';

interface RawCatalogProduct {
    id?: number | string;
    amount?: number | string;
    amounts?: Array<number | string>;
}

interface RawCatalogRecipe {
    id?: number | string;
    products?: RawCatalogProduct[];
    results?: RawCatalogProduct[];
}

interface OutputRange {
    min: number;
    max: number;
}

interface LegacyRecipeOutputRange {
    resultMaxQuantity: number | null;
    procMaxQuantity: number | null;
}

let cachedOutputRanges: Map<number, Map<number, OutputRange>> | null = null;

function toPositiveAmounts(product: RawCatalogProduct): number[] {
    if (Array.isArray(product.amounts) && product.amounts.length > 0) {
        return product.amounts
            .map((amount) => Number(amount))
            .filter((amount) => Number.isFinite(amount) && amount > 0);
    }

    const amount = Number(product.amount ?? 0);
    return Number.isFinite(amount) && amount > 0 ? [amount] : [];
}

function getRecipeProducts(recipe: RawCatalogRecipe): RawCatalogProduct[] {
    if (Array.isArray(recipe.products) && recipe.products.length > 0) {
        return recipe.products;
    }

    if (Array.isArray(recipe.results) && recipe.results.length > 0) {
        return recipe.results;
    }

    return [];
}

function resolveSnapshotPath(): string | null {
    const candidates = [
        path.resolve(process.cwd(), 'packages/db/bdo_recipes.json'),
        path.resolve(process.cwd(), '../packages/db/bdo_recipes.json'),
        path.resolve(process.cwd(), '../../packages/db/bdo_recipes.json'),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function buildOutputRangeCache(): Map<number, Map<number, OutputRange>> {
    const snapshotPath = resolveSnapshotPath();
    if (!snapshotPath) {
        return new Map();
    }

    const rawSnapshot = fs.readFileSync(snapshotPath, 'utf8');
    const recipes = JSON.parse(rawSnapshot) as RawCatalogRecipe[];
    const recipeRanges = new Map<number, Map<number, OutputRange>>();

    recipes.forEach((recipe) => {
        const recipeId = Number(recipe.id);
        if (!Number.isFinite(recipeId) || recipeId <= 0) {
            return;
        }

        const itemRanges = new Map<number, OutputRange>();
        getRecipeProducts(recipe).forEach((product) => {
            const itemId = Number(product.id);
            const amounts = toPositiveAmounts(product);
            if (!Number.isFinite(itemId) || itemId <= 0 || amounts.length === 0) {
                return;
            }

            const min = Math.min(...amounts);
            const max = Math.max(...amounts);
            const current = itemRanges.get(itemId);

            if (!current) {
                itemRanges.set(itemId, { min, max });
                return;
            }

            itemRanges.set(itemId, {
                min: Math.min(current.min, min),
                max: Math.max(current.max, max),
            });
        });

        recipeRanges.set(recipeId, itemRanges);
    });

    return recipeRanges;
}

function getOutputRangeCache(): Map<number, Map<number, OutputRange>> {
    if (!cachedOutputRanges) {
        cachedOutputRanges = buildOutputRangeCache();
    }

    return cachedOutputRanges;
}

export function getLegacyRecipeOutputRange(
    legacyRecipeId: number,
    resultItemId: number,
    procItemId: number | null,
): LegacyRecipeOutputRange {
    const recipeRanges = getOutputRangeCache().get(legacyRecipeId);

    return {
        resultMaxQuantity: recipeRanges?.get(resultItemId)?.max ?? null,
        procMaxQuantity: procItemId == null ? null : recipeRanges?.get(procItemId)?.max ?? null,
    };
}

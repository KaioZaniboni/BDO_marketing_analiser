import {
    createEmptySkipCounts,
    ensureItem,
    getMinimumAmount,
    getProducts,
    groupProducts,
    isSupportedRecipeType,
} from './shared';
import type { Item, RawCatalogRecipe, RecipeIngredient, SeedDataBuildResult, SeedRecipe } from './types';

function evaluateRecipeForSeed(rawRecipe: RawCatalogRecipe, itemsMap: Map<number, Item>) {
    const recipeType = isSupportedRecipeType(rawRecipe.main_category) ? rawRecipe.main_category : null;
    if (!recipeType) {
        return { recipe: null, skipReason: 'unsupported_type' as const };
    }

    if (!Array.isArray(rawRecipe.ingredients) || rawRecipe.ingredients.length === 0) {
        return { recipe: null, skipReason: 'missing_ingredients' as const };
    }

    const materials = rawRecipe.ingredients
        .map((ingredient) => {
            ensureItem(itemsMap, ingredient, false);

            const itemId = Number(ingredient.id);
            const quantity = Number(ingredient.amount);
            if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
                return null;
            }

            return { itemId, quantity };
        })
        .filter((ingredient): ingredient is RecipeIngredient => Boolean(ingredient));

    if (materials.length === 0) {
        return { recipe: null, skipReason: 'missing_material_rows' as const };
    }

    const rawProducts = getProducts(rawRecipe);
    if (rawProducts.length === 0) {
        return { recipe: null, skipReason: 'missing_products' as const };
    }

    const { baseProduct, procProduct } = groupProducts(itemsMap, rawProducts, Number(rawRecipe.grade_type ?? 0));
    if (!baseProduct) {
        return { recipe: null, skipReason: 'missing_base_product' as const };
    }

    return {
        recipe: {
            id: rawRecipe.id,
            name: rawRecipe.name ?? baseProduct.name,
            type: recipeType,
            experience: 0,
            cookTimeSeconds: 0,
            ingredients: materials,
            resultItemId: baseProduct.id,
            resultQuantity: getMinimumAmount(baseProduct),
            procItemId: procProduct?.id ?? null,
            procQuantity: procProduct ? getMinimumAmount(procProduct) : null,
        } satisfies SeedRecipe,
    };
}

export function buildSeedData(snapshotRecipes: RawCatalogRecipe[], baseItems: Item[] = []): SeedDataBuildResult {
    const itemsMap = new Map(baseItems.map((item) => [item.id, item]));
    const recipes: SeedRecipe[] = [];
    const skippedRecipeIds: number[] = [];
    const skippedByReason = createEmptySkipCounts();

    snapshotRecipes.forEach((recipe) => {
        const evaluated = evaluateRecipeForSeed(recipe, itemsMap);
        if (!evaluated.recipe) {
            skippedRecipeIds.push(recipe.id);
            skippedByReason[evaluated.skipReason] += 1;
            return;
        }

        recipes.push(evaluated.recipe);
    });

    return {
        items: Array.from(itemsMap.values()).sort((left, right) => left.id - right.id),
        recipes: recipes.sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name) || left.id - right.id),
        skippedRecipeIds: skippedRecipeIds.sort((left, right) => left - right),
        skippedByReason,
    };
}
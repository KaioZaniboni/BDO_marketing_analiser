import type {
    CatalogSkipReason,
    Item,
    RawCatalogItem,
    RawCatalogRecipe,
    SupportedRecipeType,
} from './types';
import { SUPPORTED_RECIPE_TYPES } from './types';

export function createEmptyTypeCounts(): Record<SupportedRecipeType, number> {
    return {
        cooking: 0,
        alchemy: 0,
        processing: 0,
    };
}

export function createEmptySkipCounts(): Record<CatalogSkipReason, number> {
    return {
        unsupported_type: 0,
        missing_ingredients: 0,
        missing_material_rows: 0,
        missing_products: 0,
        missing_base_product: 0,
    };
}

export function isSupportedRecipeType(value: string | null | undefined): value is SupportedRecipeType {
    return SUPPORTED_RECIPE_TYPES.includes(value as SupportedRecipeType);
}

export function getProducts(recipe: RawCatalogRecipe): RawCatalogItem[] {
    if (Array.isArray(recipe.products) && recipe.products.length > 0) {
        return recipe.products;
    }

    if (Array.isArray(recipe.results) && recipe.results.length > 0) {
        return recipe.results;
    }

    return [];
}

export function ensureItem(itemsMap: Map<number, Item>, rawItem: RawCatalogItem | null | undefined, isTradeable: boolean): void {
    const itemId = Number(rawItem?.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
        return;
    }

    const existing = itemsMap.get(itemId);
    itemsMap.set(itemId, {
        id: itemId,
        name: rawItem?.name ?? existing?.name ?? `Item ${itemId}`,
        iconUrl: rawItem?.icon_image ?? existing?.iconUrl,
        grade: Number(rawItem?.grade_type ?? existing?.grade ?? 0),
        categoryId: Number(rawItem?.market_main_category ?? existing?.categoryId),
        isTradeable: existing?.isTradeable ?? isTradeable,
    });
}

export function toPositiveAmounts(product: RawCatalogItem): number[] {
    if (Array.isArray(product.amounts) && product.amounts.length > 0) {
        return product.amounts
            .map((amount) => Number(amount))
            .filter((amount) => Number.isFinite(amount) && amount > 0);
    }

    const amount = Number(product.amount ?? 1);
    return Number.isFinite(amount) && amount > 0 ? [amount] : [];
}

export function getMinimumAmount(product: { amounts: number[] }): number {
    return product.amounts.length > 0 ? Math.min(...product.amounts) : 1;
}

export function groupProducts(itemsMap: Map<number, Item>, rawProducts: RawCatalogItem[], recipeGrade: number) {
    const primaryProductId = Number(rawProducts[0]?.id ?? 0) || null;
    const productGroups = new Map<number, {
        id: number;
        name: string;
        amounts: number[];
        grade: number;
        firstSeenIndex: number;
    }>();

    rawProducts.forEach((product, index) => {
        ensureItem(itemsMap, product, false);

        const itemId = Number(product.id);
        const amounts = toPositiveAmounts(product);
        if (!Number.isFinite(itemId) || itemId <= 0 || amounts.length === 0) {
            return;
        }

        const existing = productGroups.get(itemId);
        if (existing) {
            existing.amounts.push(...amounts);
            return;
        }

        productGroups.set(itemId, {
            id: itemId,
            name: product.name ?? `Item ${itemId}`,
            amounts,
            grade: Number(product.grade_type ?? 0),
            firstSeenIndex: index,
        });
    });

    const groupedProducts = Array.from(productGroups.values()).sort((left, right) => {
        const leftIsPrimary = left.id === primaryProductId ? 0 : 1;
        const rightIsPrimary = right.id === primaryProductId ? 0 : 1;
        if (leftIsPrimary !== rightIsPrimary) {
            return leftIsPrimary - rightIsPrimary;
        }

        const leftIsRare = left.grade > recipeGrade ? 1 : 0;
        const rightIsRare = right.grade > recipeGrade ? 1 : 0;
        if (leftIsRare !== rightIsRare) {
            return leftIsRare - rightIsRare;
        }

        return left.firstSeenIndex - right.firstSeenIndex;
    });

    const baseProduct = groupedProducts[0] ?? null;
    const procProduct = groupedProducts
        .filter((product) => product.id !== baseProduct?.id)
        .sort((left, right) => {
            const leftRare = left.grade > recipeGrade ? 0 : 1;
            const rightRare = right.grade > recipeGrade ? 0 : 1;
            if (leftRare !== rightRare) {
                return leftRare - rightRare;
            }

            return left.firstSeenIndex - right.firstSeenIndex;
        })[0] ?? null;

    return { baseProduct, procProduct };
}

export function findDuplicateIds(recipes: RawCatalogRecipe[]): number[] {
    const seen = new Set<number>();
    const duplicates = new Set<number>();

    recipes.forEach((recipe) => {
        if (seen.has(recipe.id)) {
            duplicates.add(recipe.id);
            return;
        }

        seen.add(recipe.id);
    });

    return Array.from(duplicates).sort((left, right) => left - right);
}
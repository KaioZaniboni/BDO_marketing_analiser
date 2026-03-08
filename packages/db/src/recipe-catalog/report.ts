import { createEmptySkipCounts, createEmptyTypeCounts, findDuplicateIds, isSupportedRecipeType } from './shared';
import { SUPPORTED_RECIPE_TYPES } from './types';
import type {
    CatalogSkipReason,
    CatalogValidationReport,
    Item,
    RawCatalogRecipe,
    SeedRecipe,
} from './types';

interface CatalogValidationInput {
    snapshotRecipes: RawCatalogRecipe[];
    items: Item[];
    recipes: SeedRecipe[];
    duplicateSnapshotIds?: number[];
    skippedRecipeIds?: number[];
    skippedByReason?: Record<CatalogSkipReason, number>;
}

export function createCatalogValidationReport(input: CatalogValidationInput): CatalogValidationReport {
    const snapshotByType = createEmptyTypeCounts();
    input.snapshotRecipes.forEach((recipe) => {
        if (isSupportedRecipeType(recipe.main_category)) {
            snapshotByType[recipe.main_category] += 1;
        }
    });

    const seedRecipeByType = createEmptyTypeCounts();
    input.recipes.forEach((recipe) => {
        seedRecipeByType[recipe.type] += 1;
    });

    const knownItemIds = new Set(input.items.map((item) => item.id));
    const missingItemIds = new Set<number>();
    input.recipes.forEach((recipe) => {
        recipe.ingredients.forEach((ingredient) => {
            if (!knownItemIds.has(ingredient.itemId)) {
                missingItemIds.add(ingredient.itemId);
            }
        });

        [recipe.resultItemId, recipe.procItemId ?? null].forEach((itemId) => {
            if (itemId && !knownItemIds.has(itemId)) {
                missingItemIds.add(itemId);
            }
        });
    });

    return {
        snapshotTotal: input.snapshotRecipes.length,
        snapshotByType,
        seedRecipeTotal: input.recipes.length,
        seedRecipeByType,
        itemTotal: input.items.length,
        duplicateSnapshotIds: (input.duplicateSnapshotIds ?? findDuplicateIds(input.snapshotRecipes)).sort((left, right) => left - right),
        skippedRecipeIds: [...(input.skippedRecipeIds ?? [])].sort((left, right) => left - right),
        skippedByReason: input.skippedByReason ?? createEmptySkipCounts(),
        missingItemIds: Array.from(missingItemIds).sort((left, right) => left - right),
    };
}

export function formatCatalogReport(report: CatalogValidationReport): string {
    return [
        `Snapshot suportado: ${report.snapshotTotal} (${SUPPORTED_RECIPE_TYPES.map((type) => `${type}: ${report.snapshotByType[type]}`).join(', ')})`,
        `Seed materializável: ${report.seedRecipeTotal} (${SUPPORTED_RECIPE_TYPES.map((type) => `${type}: ${report.seedRecipeByType[type]}`).join(', ')})`,
        `Itens materializados: ${report.itemTotal}`,
        `Receitas ignoradas: ${report.skippedRecipeIds.length} (${Object.entries(report.skippedByReason).map(([reason, total]) => `${reason}: ${total}`).join(', ')})`,
        `IDs duplicados no snapshot: ${report.duplicateSnapshotIds.length}`,
        `IDs de itens ausentes: ${report.missingItemIds.length}`,
    ].join('\n');
}
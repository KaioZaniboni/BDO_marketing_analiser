import assert from 'node:assert/strict';
import path from 'node:path';

import { buildSeedData, createCatalogValidationReport, type RawCatalogRecipe } from './recipe-catalog';
import { loadRecipeCurations } from './canonical-recipes.js';
import { resolveCatalogPaths } from './recipe-catalog';
import { normalizeRecipeCurationTypeFilter } from './recipe-curation.js';
import {
    loadRecipeCurations as loadRecipeCurationsFromPackage,
    normalizeRecipeCurationTypeFilter as normalizeRecipeCurationTypeFilterFromPackage,
    resolveCatalogPaths as resolveCatalogPathsFromPackage,
} from './index';

const snapshotRecipes: RawCatalogRecipe[] = [
    {
        id: 100,
        name: 'Cerveja de Teste',
        main_category: 'cooking',
        grade_type: 1,
        ingredients: [
            { id: 1, name: 'Trigo', amount: 5, grade_type: 0, icon_image: 'wheat', market_main_category: 10 },
            { id: 2, name: 'Água Mineral', amount: 6, grade_type: 0, icon_image: 'water', market_main_category: 10 },
        ],
        products: [
            { id: 10, name: 'Cerveja', amounts: [1, 2], grade_type: 1, icon_image: 'beer', market_main_category: 20 },
            { id: 11, name: 'Cerveja Gelada', amounts: [1], grade_type: 2, icon_image: 'rare', market_main_category: 20 },
        ],
    },
    {
        id: 200,
        name: 'Receita Inválida',
        main_category: 'alchemy',
        ingredients: null,
        products: null,
    },
];

const { items, recipes, skippedRecipeIds, skippedByReason } = buildSeedData(snapshotRecipes);
const report = createCatalogValidationReport({
    snapshotRecipes,
    items,
    recipes,
    skippedRecipeIds,
    skippedByReason,
});

assert.equal(recipes.length, 1);
assert.equal(recipes[0]?.resultItemId, 10);
assert.equal(recipes[0]?.resultQuantity, 1);
assert.equal(recipes[0]?.procItemId, 11);
assert.deepEqual(skippedRecipeIds, [200]);
assert.equal(report.snapshotByType.cooking, 1);
assert.equal(report.snapshotByType.alchemy, 1);
assert.equal(report.seedRecipeByType.cooking, 1);
assert.equal(report.seedRecipeByType.alchemy, 0);
assert.equal(report.skippedByReason.missing_ingredients, 1);
assert.equal(report.missingItemIds.length, 0);

const catalogPaths = resolveCatalogPaths();
assert.equal(path.basename(catalogPaths.snapshotPath), 'bdo_recipes.json');
assert.equal(path.basename(catalogPaths.itemsPath), 'items.json');
assert.equal(path.basename(catalogPaths.recipesPath), 'recipes.json');
assert.equal(path.basename(catalogPaths.seedDataDir), 'seed-data');
assert.equal(path.dirname(catalogPaths.itemsPath), catalogPaths.seedDataDir);
assert.equal(path.dirname(catalogPaths.recipesPath), catalogPaths.seedDataDir);
assert.equal(resolveCatalogPathsFromPackage, resolveCatalogPaths);
assert.equal(loadRecipeCurationsFromPackage, loadRecipeCurations);
assert.equal(normalizeRecipeCurationTypeFilterFromPackage, normalizeRecipeCurationTypeFilter);

console.log('recipe-catalog.test.ts: ok');
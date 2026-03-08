import fs from 'node:fs';
import path from 'node:path';

import { createCatalogValidationReport } from './report';
import { buildSeedData } from './transform';
import type { CatalogArtifacts, CatalogPaths, Item, RawCatalogRecipe, SeedRecipe } from './types';

export function resolveCatalogPaths(): CatalogPaths {
    const srcDir = path.join(__dirname, '..');
    const packageDir = path.join(srcDir, '..');
    const seedDataDir = path.join(srcDir, 'seed-data');

    return {
        snapshotPath: path.join(packageDir, 'bdo_recipes.json'),
        itemsPath: path.join(seedDataDir, 'items.json'),
        recipesPath: path.join(seedDataDir, 'recipes.json'),
        legacyMarketSeedPath: path.join(seedDataDir, 'market_prices.json'),
        seedDataDir,
    };
}

export function writeCatalogArtifacts(artifacts: CatalogArtifacts): void {
    const paths = resolveCatalogPaths();
    fs.mkdirSync(paths.seedDataDir, { recursive: true });

    fs.writeFileSync(paths.snapshotPath, JSON.stringify(artifacts.snapshotRecipes, null, 2));
    fs.writeFileSync(paths.itemsPath, JSON.stringify(artifacts.items, null, 2));
    fs.writeFileSync(paths.recipesPath, JSON.stringify(artifacts.recipes, null, 2));

    if (fs.existsSync(paths.legacyMarketSeedPath)) {
        fs.unlinkSync(paths.legacyMarketSeedPath);
    }
}

export function readLocalCatalogArtifacts(): CatalogArtifacts {
    const paths = resolveCatalogPaths();
    const snapshotRecipes = JSON.parse(fs.readFileSync(paths.snapshotPath, 'utf8')) as RawCatalogRecipe[];
    const items = JSON.parse(fs.readFileSync(paths.itemsPath, 'utf8')) as Item[];
    const recipes = JSON.parse(fs.readFileSync(paths.recipesPath, 'utf8')) as SeedRecipe[];

    const { skippedRecipeIds, skippedByReason } = buildSeedData(snapshotRecipes, items);
    return {
        snapshotRecipes,
        items,
        recipes,
        report: createCatalogValidationReport({
            snapshotRecipes,
            items,
            recipes,
            skippedRecipeIds,
            skippedByReason,
        }),
    };
}
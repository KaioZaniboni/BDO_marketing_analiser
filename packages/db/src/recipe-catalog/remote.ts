import { createCatalogValidationReport } from './report';
import { ensureItem, isSupportedRecipeType } from './shared';
import { buildSeedData } from './transform';
import type { CatalogArtifacts, Item, RawCatalogRecipe } from './types';

const RECIPE_API_URL = 'https://apiv2.bdolytics.com/pt/SA/db/recipes?page=';
const MARKET_API_URL = 'https://apiv2.bdolytics.com/pt/SA/market/central-market-data';

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: { accept: 'application/json' },
    });
    const rawBody = await response.text();

    try {
        return JSON.parse(rawBody) as T;
    } catch {
        throw new Error(`Unexpected non-JSON response (${response.status}) from ${url}: ${rawBody.slice(0, 120)}`);
    }
}

async function loadMarketItems(itemsMap: Map<number, Item>): Promise<void> {
    try {
        const marketData = await fetchJson<{ data?: Array<Record<string, unknown>> }>(MARKET_API_URL);
        marketData.data?.forEach((item) => {
            ensureItem(itemsMap, {
                id: Number(item.item_id),
                name: typeof item.name === 'string' ? item.name : null,
                icon_image: typeof item.icon_image === 'string' ? item.icon_image : null,
                grade_type: Number(item.grade_type ?? 0),
                market_main_category: Number(item.market_main_category ?? 0),
            }, true);
        });
    } catch (error) {
        console.warn('Aviso: falha ao carregar itens do mercado; seguindo com os itens descobertos nas receitas.', error);
    }
}

async function fetchSupportedSnapshotRecipes() {
    const recipesById = new Map<number, RawCatalogRecipe>();
    const duplicateIds = new Set<number>();

    for (let page = 1; ; page++) {
        const data = await fetchJson<{ data?: RawCatalogRecipe[] }>(`${RECIPE_API_URL}${page}`);
        if (!Array.isArray(data.data) || data.data.length === 0) {
            break;
        }

        for (const recipe of data.data) {
            if (!isSupportedRecipeType(recipe.main_category)) {
                continue;
            }

            if (recipesById.has(recipe.id)) {
                duplicateIds.add(recipe.id);
            }

            recipesById.set(recipe.id, recipe);
        }
    }

    return {
        snapshotRecipes: Array.from(recipesById.values()).sort((left, right) => left.id - right.id),
        duplicateSnapshotIds: Array.from(duplicateIds).sort((left, right) => left - right),
    };
}

export async function buildRemoteCatalogArtifacts(): Promise<CatalogArtifacts> {
    const marketItems = new Map<number, Item>();
    await loadMarketItems(marketItems);

    const { snapshotRecipes, duplicateSnapshotIds } = await fetchSupportedSnapshotRecipes();
    const { items, recipes, skippedRecipeIds, skippedByReason } = buildSeedData(snapshotRecipes, Array.from(marketItems.values()));

    return {
        snapshotRecipes,
        items,
        recipes,
        report: createCatalogValidationReport({
            snapshotRecipes,
            items,
            recipes,
            duplicateSnapshotIds,
            skippedRecipeIds,
            skippedByReason,
        }),
    };
}
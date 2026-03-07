import * as fs from 'fs';
import * as path from 'path';

interface Item {
    id: number;
    name: string;
    iconUrl?: string;
    grade?: number;
    categoryId?: number;
    isTradeable?: boolean;
}

interface RecipeIngredient {
    itemId: number;
    quantity: number;
}

interface Recipe {
    id: number;
    name: string;
    type: string;
    experience: number;
    cookTimeSeconds: number;
    ingredients: RecipeIngredient[];
    resultItemId: number;
    resultQuantity: number;
    procItemId?: number | null;
    procQuantity?: number | null;
}

const itemsMap = new Map<number, Item>();
const recipeMap = new Map<number, Recipe>();
const supportedRecipeTypes = new Set(['cooking', 'alchemy', 'processing']);

async function fetchJson(url: string) {
    const response = await fetch(url, {
        headers: {
            accept: 'application/json',
        },
    });

    const rawBody = await response.text();
    try {
        return JSON.parse(rawBody);
    } catch {
        throw new Error(`Unexpected non-JSON response (${response.status}) from ${url}: ${rawBody.slice(0, 120)}`);
    }
}

function getProducts(recipe: any): any[] {
    if (Array.isArray(recipe?.products) && recipe.products.length > 0) {
        return recipe.products;
    }

    if (Array.isArray(recipe?.results) && recipe.results.length > 0) {
        return recipe.results;
    }

    return [];
}

function ensureItem(rawItem: any, isTradeable: boolean) {
    if (!rawItem?.id) {
        return;
    }

    const existing = itemsMap.get(rawItem.id);
    itemsMap.set(rawItem.id, {
        id: rawItem.id,
        name: rawItem.name ?? existing?.name ?? `Item ${rawItem.id}`,
        iconUrl: rawItem.icon_image ?? existing?.iconUrl,
        grade: rawItem.grade_type ?? existing?.grade ?? 0,
        categoryId: rawItem.market_main_category ?? existing?.categoryId,
        isTradeable: existing?.isTradeable ?? isTradeable,
    });
}

function getMinimumAmount(product: { amounts: number[] }): number {
    if (product.amounts.length === 0) {
        return 1;
    }

    return Math.min(...product.amounts);
}

function groupProducts(rawProducts: any[], recipeGrade: number) {
    const primaryProductId = rawProducts[0]?.id ?? null;
    const productGroups = new Map<number, {
        id: number;
        name: string;
        amounts: number[];
        grade: number;
        firstSeenIndex: number;
    }>();

    rawProducts.forEach((product, index) => {
        ensureItem(product, false);

        const amounts = Array.isArray(product.amounts) && product.amounts.length > 0
            ? product.amounts.map((amount: unknown) => Number(amount)).filter((amount: number) => Number.isFinite(amount) && amount > 0)
            : [Number(product.amount ?? 1)].filter((amount) => Number.isFinite(amount) && amount > 0);

        const existing = productGroups.get(product.id);
        if (existing) {
            existing.amounts.push(...amounts);
            return;
        }

        productGroups.set(product.id, {
            id: product.id,
            name: product.name ?? `Item ${product.id}`,
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

async function scrapeBDOLytics() {
    console.log('Fetching Central Market Data for all Items...');
    try {
        const marketData = await fetchJson('https://apiv2.bdolytics.com/pt/SA/market/central-market-data');

        if (marketData && marketData.data) {
            console.log(`Loaded ${marketData.data.length} market items.`);
            for (const m of marketData.data) {
                ensureItem({
                    id: m.item_id,
                    name: m.name,
                    icon_image: m.icon_image,
                    grade_type: m.grade_type,
                    market_main_category: m.market_main_category,
                }, true);
            }
        }
    } catch (e) {
        console.error('Error fetching market data:', e);
    }

    console.log('\nScraping recipes catalog...');

    let page = 1;
    let added = 0;
    let updated = 0;
    let skipped = 0;

    while (true) {
        try {
            const data = await fetchJson(`https://apiv2.bdolytics.com/pt/SA/db/recipes?page=${page}`);

            if (!Array.isArray(data.data) || data.data.length === 0) {
                break;
            }

            for (const r of data.data) {
                const recipeType = supportedRecipeTypes.has(r.main_category) ? r.main_category : null;
                const rawProducts = getProducts(r);
                if (!recipeType || !Array.isArray(r.ingredients) || r.ingredients.length === 0 || rawProducts.length === 0) {
                    skipped++;
                    continue;
                }

                const materials = r.ingredients.map((ing: any) => {
                    ensureItem(ing, false);
                    return { itemId: ing.id, quantity: ing.amount };
                });

                const { baseProduct, procProduct } = groupProducts(rawProducts, Number(r.grade_type ?? 0));
                if (!baseProduct) {
                    skipped++;
                    continue;
                }

                const nextRecipe: Recipe = {
                    id: r.id,
                    name: r.name ?? baseProduct.name,
                    type: recipeType,
                    experience: 0,
                    cookTimeSeconds: 0,
                    ingredients: materials,
                    resultItemId: baseProduct.id,
                    resultQuantity: getMinimumAmount(baseProduct),
                    procItemId: procProduct?.id || null,
                    procQuantity: procProduct ? getMinimumAmount(procProduct) : null,
                };

                if (recipeMap.has(r.id)) {
                    updated++;
                } else {
                    added++;
                }
                recipeMap.set(r.id, nextRecipe);
            }

            page++;
            if (page % 5 === 0) console.log(`  ...fetched page ${page}`);
        } catch (err) {
            console.error(`Error scraping recipes page ${page}:`, err);
            break;
        }
    }

    console.log(`  Finished recipes. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);

    const itemsArray = Array.from(itemsMap.values());
    const recipesArray = Array.from(recipeMap.values()).sort((left, right) => (
        left.type.localeCompare(right.type)
        || left.name.localeCompare(right.name)
        || left.id - right.id
    ));

    console.log('\n=== Final Results ===');
    console.log(`Total items: ${itemsArray.length}`);
    console.log(`Total recipes: ${recipesArray.length}`);

    const dataDir = path.join(__dirname, 'seed-data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(path.join(dataDir, 'items.json'), JSON.stringify(itemsArray, null, 2));
    fs.writeFileSync(path.join(dataDir, 'recipes.json'), JSON.stringify(recipesArray, null, 2));

    console.log('\nSaved to seed-data/items.json and seed-data/recipes.json');

    const legacyMarketSeedPath = path.join(dataDir, 'market_prices.json');
    if (fs.existsSync(legacyMarketSeedPath)) {
        fs.unlinkSync(legacyMarketSeedPath);
        console.log('Removed legacy seed-data/market_prices.json');
    }
}

scrapeBDOLytics().catch((error) => {
    console.error('Failed to scrape recipes:', error);
    process.exit(1);
});

import * as fs from 'fs';
import * as path from 'path';

interface Item {
    id: number;
    name: string;
    iconUrl?: string;
    grade?: number;
    categoryId?: number;
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

async function scrapeBDOLytics() {
    console.log('Fetching Central Market Data for all Items...');
    let marketData: any = null;
    try {
        const marketRes = await fetch('https://apiv2.bdolytics.com/pt/SA/market/central-market-data');
        marketData = await marketRes.json();

        if (marketData && marketData.data) {
            console.log(`Loaded ${marketData.data.length} market items.`);
            for (const m of marketData.data) {
                itemsMap.set(m.item_id, {
                    id: m.item_id,
                    name: m.name,
                    iconUrl: m.icon_image,
                    grade: m.grade_type,
                    categoryId: m.market_main_category,
                });
            }
        }
    } catch (e) {
        console.error('Error fetching market data:', e);
    }

    const categories = ['cooking', 'alchemy', 'processing'];

    for (const cat of categories) {
        console.log(`\nScraping category: ${cat}...`);

        let page = 1;
        let added = 0;
        let updated = 0;
        let skipped = 0;

        while (true) {
            try {
                const res = await fetch(`https://apiv2.bdolytics.com/pt/SA/db/recipes?page=${page}&main_category=${cat}`);
                const data = await res.json();

                if (!data.data || data.data.length === 0) break;

                for (const r of data.data) {
                    const recipeType = supportedRecipeTypes.has(r.main_category) ? r.main_category : cat;
                    if (!r.ingredients || r.ingredients.length === 0) {
                        skipped++;
                        continue;
                    }
                    if (!r.products || r.products.length === 0) {
                        skipped++;
                        continue;
                    }

                    const materials = r.ingredients.map((ing: any) => {
                        if (!itemsMap.has(ing.id)) {
                            itemsMap.set(ing.id, {
                                id: ing.id,
                                name: ing.name,
                                iconUrl: ing.icon_image,
                                grade: ing.grade_type,
                            });
                        }
                        return { itemId: ing.id, quantity: ing.amount };
                    });

                    const productGroups = new Map<number, { id: number; name: string; amounts: number[]; isProc: boolean }>();
                    for (const p of r.products) {
                        if (!itemsMap.has(p.id)) {
                            itemsMap.set(p.id, {
                                id: p.id,
                                name: p.name,
                                iconUrl: p.icon_image,
                                grade: p.grade_type,
                            });
                        }

                        const isProc = p.grade_type > r.grade_type || p.id !== r.products[0].id;
                        const prodAmounts = p.amounts ? [...p.amounts] : (p.amount ? [p.amount] : [1]);

                        if (!productGroups.has(p.id)) {
                            productGroups.set(p.id, { id: p.id, name: p.name, amounts: prodAmounts, isProc });
                        } else {
                            const group = productGroups.get(p.id)!;
                            group.amounts.push(...prodAmounts);
                        }
                    }

                    const uniqueProducts = Array.from(productGroups.values());
                    uniqueProducts.sort((a, b) => Number(a.isProc) - Number(b.isProc));

                    const baseProduct = uniqueProducts[0];
                    const procProduct = uniqueProducts.length > 1 ? uniqueProducts[1] : null;
                    if (!baseProduct) {
                        skipped++;
                        continue;
                    }

                    let resultQty = 1;
                    if (baseProduct.amounts.length > 0) {
                        const min = Math.min(...baseProduct.amounts);
                        const max = Math.max(...baseProduct.amounts);
                        resultQty = (min + max) / 2;
                    }

                    let procQty = null;
                    if (procProduct && procProduct.amounts.length > 0) {
                        const min = Math.min(...procProduct.amounts);
                        const max = Math.max(...procProduct.amounts);
                        procQty = ((min + max) / 2) * 0.3;
                    }

                    const nextRecipe: Recipe = {
                        id: r.id,
                        name: r.name ?? baseProduct.name,
                        type: recipeType,
                        experience: 400,
                        cookTimeSeconds: recipeType === 'cooking' ? 1.0 : recipeType === 'alchemy' ? 1.0 : 10.0,
                        ingredients: materials,
                        resultItemId: baseProduct.id,
                        resultQuantity: Number(resultQty.toFixed(2)),
                        procItemId: procProduct?.id || null,
                        procQuantity: procQty ? Number(procQty.toFixed(2)) : null,
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
                console.error(`Error scraping ${cat} page ${page}:`, err);
                break;
            }
        }
        console.log(`  Finished ${cat}. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
    }

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
    if (marketData && marketData.data) {
        fs.writeFileSync(path.join(dataDir, 'market_prices.json'), JSON.stringify(marketData.data, null, 2));
        console.log('Saved seed-data/market_prices.json');
    }
}

scrapeBDOLytics();

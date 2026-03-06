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
const recipesArray: Recipe[] = [];

async function scrapeBDOLytics() {
    console.log('Fetching Central Market Data for all Items...');
    let marketData: any = null;
    try {
        const marketRes = await fetch('https://apiv2.bdolytics.com/pt/SA/market/central-market-data');
        marketData = await marketRes.json();

        // Seed items from market
        if (marketData && marketData.data) {
            console.log(`Loaded ${marketData.data.length} market items.`);
            for (const m of marketData.data) {
                itemsMap.set(m.item_id, {
                    id: m.item_id,
                    name: m.name,
                    iconUrl: m.icon_image,
                    grade: m.grade_type,
                    categoryId: m.market_main_category
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
        let skipped = 0;

        while (true) {
            try {
                const res = await fetch(`https://apiv2.bdolytics.com/pt/SA/db/recipes?page=${page}&main_category=${cat}`);
                const data = await res.json();

                if (!data.data || data.data.length === 0) break;

                for (const r of data.data) {
                    if (!r.ingredients || r.ingredients.length === 0) {
                        skipped++;
                        continue;
                    }
                    if (!r.products || r.products.length === 0) {
                        skipped++;
                        continue;
                    }

                    // Process ingredients
                    const materials = r.ingredients.map((ing: any) => {
                        // Ensure item exists if not in market data
                        if (!itemsMap.has(ing.id)) {
                            itemsMap.set(ing.id, { id: ing.id, name: ing.name, iconUrl: ing.icon_image, grade: ing.grade_type });
                        }
                        return { itemId: ing.id, quantity: ing.amount };
                    });

                    // Process results (Find base and proc)
                    const productGroups = new Map<number, { id: number, name: string, amounts: number[], isProc: boolean }>();
                    for (const p of r.products) {
                        if (!itemsMap.has(p.id)) {
                            itemsMap.set(p.id, { id: p.id, name: p.name, iconUrl: p.icon_image, grade: p.grade_type });
                        }
                        // BDO Recipe logic: If grade is higher than base recipe grade, it's a proc. Also BDOLytics provides condition_name which indicates it.
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
                    uniqueProducts.sort((a, b) => a.isProc ? 1 : -1);

                    const baseProduct = uniqueProducts[0];
                    const procProduct = uniqueProducts.length > 1 ? uniqueProducts[1] : null;

                    // Calculate average yield based on BDOLytics provided amounts. e.g. [1, 3] -> 2.0 avg, [1, 4] -> 2.5 avg
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
                        // Approximate Proc Rate is generally ~30% per craft if at all. 
                        // Instead, we store the full average of proc craft here.
                        // The actual "Maestria multiplier" will be applied later in the frontend TRPC.
                        // But standard BDO base without mastery proc rate is around 30% of main craft.
                        procQty = ((min + max) / 2) * 0.3;
                    }

                    recipesArray.push({
                        id: r.id,
                        name: r.name,
                        type: cat,
                        experience: 400, // Fixed fallback
                        cookTimeSeconds: cat === 'cooking' ? 1.0 : (cat === 'alchemy' ? 1.0 : 10.0),
                        ingredients: materials,
                        resultItemId: baseProduct.id,
                        resultQuantity: Number(resultQty.toFixed(2)),
                        procItemId: procProduct?.id || null,
                        procQuantity: procQty ? Number(procQty.toFixed(2)) : null
                    });

                    added++;
                }

                page++;
                if (page % 5 === 0) console.log(`  ...fetched page ${page}`);
            } catch (err) {
                console.error(`Error scraping ${cat} page ${page}:`, err);
                break;
            }
        }
        console.log(`  Finished ${cat}. Added: ${added}, Skipped: ${skipped}`);
    }

    const itemsArray = Array.from(itemsMap.values());

    console.log(`\n=== Final Results ===`);
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

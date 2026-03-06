const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const itemsPath = path.join(__dirname, 'seed-data', 'items.json');
const recipesPath = path.join(__dirname, 'seed-data', 'recipes.json');
const marketPricesPath = path.join(__dirname, 'seed-data', 'market_prices.json');
const canonicalRecipesPath = path.join(__dirname, '..', 'bdo_recipes.json');

const items = fs.existsSync(itemsPath) ? require('./seed-data/items.json') : [];
const recipes = fs.existsSync(recipesPath) ? require('./seed-data/recipes.json') : [];
const marketPrices = fs.existsSync(marketPricesPath) ? require('./seed-data/market_prices.json') : [];

const prisma = new PrismaClient();

function loadCanonicalRecipeTypes() {
    const typeMap = new Map();
    if (!fs.existsSync(canonicalRecipesPath)) {
        return typeMap;
    }

    const canonicalRecipes = JSON.parse(fs.readFileSync(canonicalRecipesPath, 'utf8'));
    for (const recipe of canonicalRecipes) {
        if (['cooking', 'alchemy', 'processing'].includes(recipe.main_category)) {
            typeMap.set(recipe.id, recipe.main_category);
        }
    }

    return typeMap;
}

function normalizeRecipesForSeed(inputRecipes) {
    const canonicalTypes = loadCanonicalRecipeTypes();
    const uniqueRecipes = new Map();

    for (const recipe of inputRecipes) {
        if (!recipe?.id || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0 || !recipe.resultItemId) {
            continue;
        }

        const normalizedRecipe = {
            ...recipe,
            type: canonicalTypes.get(recipe.id) || recipe.type,
        };

        uniqueRecipes.set(recipe.id, normalizedRecipe);
    }

    return Array.from(uniqueRecipes.values()).sort((left, right) => (
        left.type.localeCompare(right.type)
        || left.name.localeCompare(right.name)
        || left.id - right.id
    ));
}

async function main() {
    console.log('Inciando seed do banco de dados...');

    if (items.length > 0) {
        console.log(`Temos ${items.length} itens para fazer seed... aguarde (pode demorar).`);
        let count = 0;
        for (const item of items) {
            await prisma.item.upsert({
                where: { id: item.id },
                update: {
                    name: item.name,
                    iconUrl: item.iconUrl || null,
                    grade: item.grade || 0,
                    categoryId: item.categoryId || null,
                },
                create: {
                    id: item.id,
                    name: item.name,
                    iconUrl: item.iconUrl || null,
                    grade: item.grade || 0,
                    categoryId: item.categoryId || null,
                },
            });
            count++;
            if (count % 1000 === 0) console.log(`  ...${count} itens inseridos`);
        }
        console.log('Seed de Itens concluido!');
    }

    if (marketPrices.length > 0) {
        console.log(`Temos ${marketPrices.length} precos de mercado para atualizar...`);
        let countP = 0;
        for (const p of marketPrices) {
            try {
                await prisma.itemPrice.upsert({
                    where: {
                        itemId_enhancementLevel: {
                            itemId: p.item_id,
                            enhancementLevel: p.enhancement_level,
                        },
                    },
                    update: {
                        basePrice: p.price,
                        lastSoldPrice: p.price,
                        currentStock: p.in_stock,
                        totalTrades: p.total_trades,
                        recordedAt: new Date(),
                    },
                    create: {
                        itemId: p.item_id,
                        enhancementLevel: p.enhancement_level,
                        basePrice: p.price,
                        lastSoldPrice: p.price,
                        currentStock: p.in_stock,
                        totalTrades: p.total_trades,
                        recordedAt: new Date(),
                    },
                });

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                await prisma.priceHistory.upsert({
                    where: {
                        itemId_enhancementLevel_recordedDate: {
                            itemId: p.item_id,
                            enhancementLevel: p.enhancement_level,
                            recordedDate: today,
                        },
                    },
                    update: {
                        price: p.price,
                        volume: p.total_trades,
                    },
                    create: {
                        itemId: p.item_id,
                        enhancementLevel: p.enhancement_level,
                        recordedDate: today,
                        price: p.price,
                        volume: p.total_trades,
                    },
                });
                countP++;
            } catch (e) {
                // Ignore items that failed foreign key
            }
            if (countP > 0 && countP % 2000 === 0) console.log(`  ...${countP} precos inseridos`);
        }
        console.log('Seed de Precos da API concluido!');
    }

    const normalizedRecipes = normalizeRecipesForSeed(recipes);
    if (normalizedRecipes.length > 0) {
        console.log(`Temos ${normalizedRecipes.length} receitas para fazer seed...`);
        let rCount = 0;
        for (const recipe of normalizedRecipes) {
            try {
                const upsertedRecipe = await prisma.recipe.upsert({
                    where: { id: recipe.id },
                    update: {
                        name: recipe.name,
                        type: recipe.type,
                        resultItemId: recipe.resultItemId,
                        resultQuantity: parseFloat(recipe.resultQuantity) || 1.0,
                        procItemId: recipe.procItemId || null,
                        procQuantity: recipe.procQuantity ? parseFloat(recipe.procQuantity) : null,
                        experience: recipe.experience || 400,
                        cookTimeSeconds: recipe.cookTimeSeconds || 1.0,
                    },
                    create: {
                        id: recipe.id,
                        name: recipe.name,
                        type: recipe.type,
                        resultItemId: recipe.resultItemId,
                        resultQuantity: parseFloat(recipe.resultQuantity) || 1.0,
                        procItemId: recipe.procItemId || null,
                        procQuantity: recipe.procQuantity ? parseFloat(recipe.procQuantity) : null,
                        experience: recipe.experience || 400,
                        cookTimeSeconds: recipe.cookTimeSeconds || 1.0,
                    },
                });

                await prisma.recipeIngredient.deleteMany({
                    where: { recipeId: upsertedRecipe.id },
                });

                for (let i = 0; i < recipe.ingredients.length; i++) {
                    const ing = recipe.ingredients[i];
                    await prisma.recipeIngredient.create({
                        data: {
                            recipeId: upsertedRecipe.id,
                            itemId: ing.itemId,
                            quantity: ing.quantity,
                            sortOrder: i,
                        },
                    });
                }
                rCount++;
            } catch (e) {
                console.error(`Falha na receita ${recipe.id}: ${e.message}`);
            }
        }
        console.log(`Seed de ${rCount} Receitas concluido!`);
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

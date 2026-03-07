const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const itemsPath = path.join(__dirname, 'seed-data', 'items.json');
const recipesPath = path.join(__dirname, 'seed-data', 'recipes.json');
const canonicalRecipesPath = path.join(__dirname, '..', 'bdo_recipes.json');

const items = fs.existsSync(itemsPath) ? require('./seed-data/items.json') : [];
const recipes = fs.existsSync(recipesPath) ? require('./seed-data/recipes.json') : [];

const prisma = new PrismaClient();

function toNumberOrDefault(value, defaultValue) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function toPositiveNumberOrDefault(value, defaultValue) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function toNullablePositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
    console.log('Limpando snapshots e histórico de mercado legados do seed...');
    await prisma.priceHistory.deleteMany();
    await prisma.itemPrice.deleteMany();

    if (items.length > 0) {
        console.log(`Temos ${items.length} itens para fazer seed... aguarde (pode demorar).`);
        let count = 0;
        for (const item of items) {
            const itemData = {
                name: item.name,
                iconUrl: item.iconUrl || null,
                grade: toNumberOrDefault(item.grade, 0),
                categoryId: item.categoryId ?? null,
                subCategoryId: item.subCategoryId ?? null,
                isTradeable: item.isTradeable !== undefined ? Boolean(item.isTradeable) : true,
            };

            await prisma.item.upsert({
                where: { id: item.id },
                update: itemData,
                create: { id: item.id, ...itemData },
            });
            count++;
            if (count % 1000 === 0) console.log(`  ...${count} itens inseridos`);
        }
        console.log('Seed de Itens concluido!');
    }

    const normalizedRecipes = normalizeRecipesForSeed(recipes);
    if (normalizedRecipes.length > 0) {
        console.log(`Temos ${normalizedRecipes.length} receitas para fazer seed...`);
        const recipeIds = normalizedRecipes.map((recipe) => recipe.id);
        const deletedIngredients = await prisma.recipeIngredient.deleteMany({
            where: { recipeId: { notIn: recipeIds } },
        });
        const deletedRecipes = await prisma.recipe.deleteMany({
            where: { id: { notIn: recipeIds } },
        });

        if (deletedRecipes.count > 0 || deletedIngredients.count > 0) {
            console.log(
                `Removidas ${deletedRecipes.count} receitas órfãs e ${deletedIngredients.count} linhas de ingredientes órfãs.`,
            );
        }

        let rCount = 0;
        for (const recipe of normalizedRecipes) {
            try {
                const recipeData = {
                    name: recipe.name,
                    type: recipe.type,
                    resultItemId: recipe.resultItemId,
                    resultQuantity: toPositiveNumberOrDefault(recipe.resultQuantity, 1.0),
                    procItemId: recipe.procItemId || null,
                    procQuantity: toNullablePositiveNumber(recipe.procQuantity),
                    experience: Math.trunc(toNumberOrDefault(recipe.experience, 0)),
                    cookTimeSeconds: toNumberOrDefault(recipe.cookTimeSeconds, 0),
                    categoryId: recipe.categoryId ?? null,
                };

                const upsertedRecipe = await prisma.recipe.upsert({
                    where: { id: recipe.id },
                    update: recipeData,
                    create: { id: recipe.id, ...recipeData },
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

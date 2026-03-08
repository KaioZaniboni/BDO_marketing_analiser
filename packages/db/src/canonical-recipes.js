const fs = require('fs');
const path = require('path');
const { mergeRecipeCurations } = require('./recipe-curation');

const recipeCurationsPath = path.join(__dirname, 'seed-data', 'recipe-curations.json');

function slugify(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'recipe';
}

function buildFallbackCanonicalKey(recipe) {
    return `${recipe.type}:${recipe.resultItemId}:${slugify(recipe.name)}`;
}

function loadRecipeCurations() {
    if (!fs.existsSync(recipeCurationsPath)) {
        return { version: 1, crafts: [] };
    }

    const raw = JSON.parse(fs.readFileSync(recipeCurationsPath, 'utf8'));
    return {
        version: Number.isFinite(Number(raw?.version)) ? Number(raw.version) : 1,
        crafts: Array.isArray(raw?.crafts) ? raw.crafts : [],
    };
}

function buildCanonicalCrafts(recipes, itemNamesById = new Map(), options = {}) {
    const curations = options.jsonDocument || loadRecipeCurations();
    const mergedCurations = mergeRecipeCurations({
        jsonRecords: curations.crafts,
        dbRecords: options.dbCurations,
    });
    const curatedByLegacyRecipeId = new Map();

    for (const craft of mergedCurations.effectiveByCanonicalKey.values()) {
        const legacyRecipeIds = Array.isArray(craft?.legacyRecipeIds) ? craft.legacyRecipeIds : [];
        legacyRecipeIds.forEach((legacyRecipeId) => curatedByLegacyRecipeId.set(Number(legacyRecipeId), craft));
    }

    const groupedCrafts = new Map();
    for (const recipe of recipes) {
        const curation = curatedByLegacyRecipeId.get(recipe.id);
        const canonicalKey = curation?.canonicalKey || buildFallbackCanonicalKey(recipe);
        const group = groupedCrafts.get(canonicalKey) || { canonicalKey, curation, recipes: [] };
        group.recipes.push(recipe);
        groupedCrafts.set(canonicalKey, group);
    }

    return Array.from(groupedCrafts.values())
        .map((group) => materializeCanonicalCraft(group, Number(options.curationVersion ?? curations.version ?? 1), itemNamesById))
        .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
}

function materializeCanonicalCraft(group, curationVersion, itemNamesById) {
    const recipes = [...group.recipes].sort((left, right) => left.id - right.id);
    const preferredPrimaryId = Number(group.curation?.primaryLegacyRecipeId);
    const primaryRecipe = recipes.find((recipe) => recipe.id === preferredPrimaryId) || recipes[0];
    const slotCurations = new Map((group.curation?.slots || []).map((slot) => [Number(slot.index), slot]));
    const slotCount = recipes.reduce((max, recipe) => Math.max(max, recipe.ingredients.length), 0);

    const slots = Array.from({ length: slotCount }, (_, index) => {
        const slotOptions = new Map();
        recipes.forEach((recipe) => {
            const ingredient = recipe.ingredients[index];
            if (ingredient) {
                slotOptions.set(`${ingredient.itemId}:${ingredient.quantity}`, ingredient);
            }
        });

        const primaryIngredient = primaryRecipe.ingredients[index];
        const slotCuration = slotCurations.get(index);
        const defaultKey = slotCuration?.defaultItemId
            ? `${slotCuration.defaultItemId}:${slotCuration.defaultQuantity ?? primaryIngredient?.quantity ?? 1}`
            : primaryIngredient
                ? `${primaryIngredient.itemId}:${primaryIngredient.quantity}`
                : Array.from(slotOptions.keys())[0];

        const options = Array.from(slotOptions.values())
            .sort((left, right) => left.itemId - right.itemId || left.quantity - right.quantity)
            .map((ingredient, optionIndex) => ({
                itemId: ingredient.itemId,
                quantity: ingredient.quantity,
                sortOrder: optionIndex,
                label: itemNamesById.get(ingredient.itemId) || null,
                isDefault: `${ingredient.itemId}:${ingredient.quantity}` === defaultKey,
                source: slotCuration ? 'curation' : 'seed',
            }));

        return {
            slotKey: slotCuration?.slotKey || `slot-${index + 1}`,
            label: slotCuration?.label || itemNamesById.get(primaryIngredient?.itemId) || `Slot ${index + 1}`,
            sortOrder: index,
            source: slotCuration ? 'curation' : 'seed',
            options,
        };
    });

    return {
        canonicalKey: group.canonicalKey,
        name: group.curation?.nameOverride || primaryRecipe.name,
        type: primaryRecipe.type,
        resultItemId: primaryRecipe.resultItemId,
        resultQuantity: Number(primaryRecipe.resultQuantity ?? 1),
        procItemId: primaryRecipe.procItemId || null,
        procQuantity: primaryRecipe.procQuantity ? Number(primaryRecipe.procQuantity) : null,
        masteryBonusPct: Number(primaryRecipe.masteryBonusPct ?? 0),
        experience: Number(primaryRecipe.experience ?? 0),
        cookTimeSeconds: Number(primaryRecipe.cookTimeSeconds ?? 0),
        categoryId: primaryRecipe.categoryId ?? null,
        source: group.curation ? 'curation' : 'seed',
        curationVersion,
        curationNotes: group.curation?.notes || null,
        slots,
        variants: recipes.map((recipe, index) => ({
            legacyRecipeId: recipe.id,
            variantKey: `legacy:${recipe.id}`,
            name: recipe.name,
            type: recipe.type,
            resultItemId: recipe.resultItemId,
            resultQuantity: Number(recipe.resultQuantity ?? 1),
            procItemId: recipe.procItemId || null,
            procQuantity: recipe.procQuantity ? Number(recipe.procQuantity) : null,
            masteryBonusPct: Number(recipe.masteryBonusPct ?? 0),
            experience: Number(recipe.experience ?? 0),
            cookTimeSeconds: Number(recipe.cookTimeSeconds ?? 0),
            categoryId: recipe.categoryId ?? null,
            sortOrder: index,
            isPrimary: recipe.id === primaryRecipe.id,
            source: group.curation ? 'curation' : 'seed',
            ingredients: recipe.ingredients,
        })),
    };
}

async function createMaterializedCanonicalCraft(prisma, craft) {
    const createdCraft = await prisma.craftingRecipeCraft.create({
        data: {
            canonicalKey: craft.canonicalKey,
            name: craft.name,
            type: craft.type,
            resultItemId: craft.resultItemId,
            resultQuantity: craft.resultQuantity,
            procItemId: craft.procItemId,
            procQuantity: craft.procQuantity,
            masteryBonusPct: craft.masteryBonusPct,
            experience: craft.experience,
            cookTimeSeconds: craft.cookTimeSeconds,
            categoryId: craft.categoryId,
            source: craft.source,
            curationVersion: craft.curationVersion,
            curationNotes: craft.curationNotes,
        },
    });

    const slotRefs = new Map();
    for (const slot of craft.slots) {
        const createdSlot = await prisma.craftingRecipeSlot.create({
            data: {
                craftId: createdCraft.id,
                slotKey: slot.slotKey,
                label: slot.label,
                sortOrder: slot.sortOrder,
                source: slot.source,
            },
        });

        const optionRefs = new Map();
        for (const option of slot.options) {
            const createdOption = await prisma.craftingRecipeSlotOption.create({
                data: {
                    slotId: createdSlot.id,
                    itemId: option.itemId,
                    quantity: option.quantity,
                    sortOrder: option.sortOrder,
                    label: option.label,
                    isDefault: option.isDefault,
                    source: option.source,
                },
            });
            optionRefs.set(`${option.itemId}:${option.quantity}`, createdOption.id);
        }

        slotRefs.set(slot.sortOrder, {
            id: createdSlot.id,
            optionRefs,
        });
    }

    for (const variant of craft.variants) {
        const createdVariant = await prisma.craftingRecipeVariant.create({
            data: {
                craftId: createdCraft.id,
                legacyRecipeId: variant.legacyRecipeId,
                variantKey: variant.variantKey,
                name: variant.name,
                type: variant.type,
                resultItemId: variant.resultItemId,
                resultQuantity: variant.resultQuantity,
                procItemId: variant.procItemId,
                procQuantity: variant.procQuantity,
                masteryBonusPct: variant.masteryBonusPct,
                experience: variant.experience,
                cookTimeSeconds: variant.cookTimeSeconds,
                categoryId: variant.categoryId,
                sortOrder: variant.sortOrder,
                isPrimary: variant.isPrimary,
                source: variant.source,
            },
        });

        for (let index = 0; index < variant.ingredients.length; index++) {
            const ingredient = variant.ingredients[index];
            const slotRef = slotRefs.get(index);
            const slotOptionId = slotRef?.optionRefs.get(`${ingredient.itemId}:${ingredient.quantity}`);

            if (slotRef?.id && slotOptionId) {
                await prisma.craftingRecipeVariantSlotSelection.create({
                    data: {
                        variantId: createdVariant.id,
                        slotId: slotRef.id,
                        slotOptionId,
                        sortOrder: index,
                    },
                });
            }
        }
    }

    return createdCraft;
}

async function replaceMaterializedCanonicalCraft(prisma, craft, options = {}) {
    const existingCanonicalKeys = Array.isArray(options.existingCanonicalKeys)
        ? Array.from(new Set(options.existingCanonicalKeys.filter(Boolean)))
        : [craft.canonicalKey];

    if (existingCanonicalKeys.length > 0) {
        await prisma.craftingRecipeCraft.deleteMany({
            where: { canonicalKey: { in: existingCanonicalKeys } },
        });
    }

    return createMaterializedCanonicalCraft(prisma, craft);
}

async function replaceAllMaterializedCanonicalCrafts(prisma, canonicalCrafts) {
    await prisma.craftingRecipeVariantSlotSelection.deleteMany();
    await prisma.craftingRecipeSlotOption.deleteMany();
    await prisma.craftingRecipeSlot.deleteMany();
    await prisma.craftingRecipeVariant.deleteMany();
    await prisma.craftingRecipeCraft.deleteMany();

    const createdCrafts = [];
    for (const craft of canonicalCrafts) {
        createdCrafts.push(await createMaterializedCanonicalCraft(prisma, craft));
    }

    return createdCrafts;
}

module.exports = {
    buildFallbackCanonicalKey,
    loadRecipeCurations,
    buildCanonicalCrafts,
    materializeCanonicalCraft,
    createMaterializedCanonicalCraft,
    replaceMaterializedCanonicalCraft,
    replaceAllMaterializedCanonicalCrafts,
};
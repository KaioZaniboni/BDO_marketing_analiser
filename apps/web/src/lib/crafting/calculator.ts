import {
    ALCHEMY_MASTERY_TABLE,
    BYPRODUCT_USAGE_MAP,
    COOKING_MASTERY_TABLE,
    DEFAULT_CRAFTING_SETTINGS,
    VENDOR_PRICE_MAP,
    type AlchemyMasteryEntry,
    type CookingMasteryEntry,
} from '@/lib/crafting/constants';
import { buildIngredientAlternativesBySlot } from '@bdo/api/src/services/recipe-alternatives';
import { getRecipeVariantKey } from '@bdo/api/src/services/recipe-identity';

export type CraftingType = 'cooking' | 'alchemy' | 'processing';

export interface CalculatorPriceHistoryPoint {
    price: bigint | number;
    volume: bigint | number;
    recordedDate: Date | string;
}

export interface CalculatorPriceSnapshot {
    basePrice: bigint | number;
    lastSoldPrice?: bigint | number | null;
    currentStock?: number | null;
    totalTrades?: bigint | number | null;
    priceMin?: bigint | number | null;
    priceMax?: bigint | number | null;
}

export interface CalculatorItem {
    id: number;
    name: string;
    weight?: number | null;
    grade?: number | null;
    isTradeable?: boolean | null;
    iconUrl?: string | null;
    prices?: CalculatorPriceSnapshot[];
    priceHistory?: CalculatorPriceHistoryPoint[];
}

export interface CalculatorIngredient {
    id?: number;
    itemId: number;
    quantity: number;
    sortOrder: number;
    item: CalculatorItem;
}

export interface CalculatorRecipe {
    id: number;
    name: string;
    type: CraftingType;
    experience: number;
    cookTimeSeconds: number;
    resultItemId: number;
    resultQuantity: number;
    procItemId?: number | null;
    procQuantity?: number | null;
    resultItem: CalculatorItem;
    procItem?: CalculatorItem | null;
    ingredients: CalculatorIngredient[];
}

export interface CraftingSettings {
    valuePackActive: boolean;
    merchantRingActive: boolean;
    familyFameBonus: number;
    weight: number;
    usedWeight: number;
    speedCookingMastery: number;
    speedCookingTime: number;
    slowCookingMastery: number;
    slowCookingTime: number;
    cookingByproductUsage: number;
    alchemyMastery: number;
    alchemyTime: number;
    alchemyByproductUsage: number;
}

export interface GlobalSettingsShape {
    hasValuePack: boolean;
    hasMerchantRing: boolean;
    familyFameBonus: number;
    weight: number;
    usedWeight: number;
    speedCookingMastery: number;
    speedCookingTime: number;
    slowCookingMastery: number;
    slowCookingTime: number;
    cookingByproductUsage: number;
    alchemyMastery: number;
    alchemyTimeSeconds: number;
    alchemyByproductUsage: number;
}

export interface CraftingCalculatorState {
    customPrices: Record<number, number>;
    taxedItemIds: number[];
    keptItemIds: number[];
    favoriteIds: Record<'cooking' | 'alchemy', number[]>;
    craftQuantities: Record<number, number>;
    selectedMaterials: Record<number, Record<number, number>>;
    useRareProcIds: number[];
    slowCookedIds: number[];
    collapsedIds: number[];
}

export interface PriceBreakdown {
    unitPrice: number;
    source: 'custom' | 'market' | 'vendor' | 'missing';
    totalTrades: number;
    currentStock: number;
}

export interface RecipeRateResult {
    normalProcRate: number;
    rareProcRate: number;
    massProcRate: number;
    timePerAction: number;
    mastery: number;
}

export interface IngredientAlternative extends CalculatorIngredient {
    subRecipeId: number | null;
    subRecipeType: CraftingType | null;
}

export interface LeafInputRow {
    itemId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    taxed: boolean;
    source: PriceBreakdown['source'];
    totalTrades: number;
    currentStock: number;
    iconUrl?: string | null;
    grade?: number | null;
    weightPerUnit: number;
}

export interface OutputRow {
    itemId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    totalRevenue: number;
    kept: boolean;
    source: PriceBreakdown['source'];
    kind: 'normal' | 'rare' | 'byproduct';
    totalTrades: number;
    currentStock: number;
    iconUrl?: string | null;
    grade?: number | null;
}

export interface LeftoverRow {
    itemId: number;
    name: string;
    quantity: number;
    value: number;
    iconUrl?: string | null;
}

export interface RecipeTreeNode {
    key: string;
    recipeId: number | null;
    itemId: number;
    parentRecipeId: number | null;
    name: string;
    type: 'recipe' | 'material';
    craftingType: CraftingType | null;
    quantityPerCraft: number;
    requestedQuantity: number;
    craftQuantity: number;
    normalProcQuantity: number;
    rareProcQuantity: number;
    totalTime: number;
    individualTime: number;
    craftingCost: number;
    totalRevenue: number;
    craftingProfit: number;
    profitPerHour: number;
    displayedProfitPerHour: number;
    outputs: OutputRow[];
    children: RecipeTreeNode[];
    leftover: LeftoverRow[];
    ingredientAlternatives: Record<number, IngredientAlternative[]>;
    unitPrice?: number;
    priceSource?: PriceBreakdown['source'];
    iconUrl?: string | null;
    grade?: number | null;
    isTradeable?: boolean | null;
}

export interface RecipeOverviewRow {
    id: number;
    name: string;
    recipe: CalculatorRecipe;
    possibleInputs: string[];
    marketPrice: number;
    silverPerHour: number;
    priceChange: number | null;
    dailyVolume: number;
    volumeChange: number | null;
    experience: number;
    favorite: boolean;
}

const COOKING_RARE_BASE_CHANCE = 0.2;
const ALCHEMY_RARE_BASE_CHANCE = 0.2;
const COOKING_BYPRODUCT_CHANCE = 0.0236;
const ALCHEMY_BYPRODUCT_CHANCE = 0.0236 * 3.7;
const LOCAL_PROC_BASE_CHANCE = 0.3;

function clampNonNegative(value: number): number {
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export function toNumber(value: bigint | number | null | undefined): number {
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getDefaultCraftingSettings(): CraftingSettings {
    return {
        ...DEFAULT_CRAFTING_SETTINGS,
    };
}

export function mapGlobalSettingsToCraftingSettings(settings: GlobalSettingsShape): CraftingSettings {
    return {
        valuePackActive: settings.hasValuePack,
        merchantRingActive: settings.hasMerchantRing,
        familyFameBonus: settings.familyFameBonus,
        weight: settings.weight,
        usedWeight: settings.usedWeight,
        speedCookingMastery: settings.speedCookingMastery,
        speedCookingTime: settings.speedCookingTime,
        slowCookingMastery: settings.slowCookingMastery,
        slowCookingTime: settings.slowCookingTime,
        cookingByproductUsage: settings.cookingByproductUsage,
        alchemyMastery: settings.alchemyMastery,
        alchemyTime: settings.alchemyTimeSeconds,
        alchemyByproductUsage: settings.alchemyByproductUsage,
    };
}

export function getDefaultCalculatorState(): CraftingCalculatorState {
    return {
        customPrices: {},
        taxedItemIds: [],
        keptItemIds: [],
        favoriteIds: {
            cooking: [],
            alchemy: [],
        },
        craftQuantities: {},
        selectedMaterials: {},
        useRareProcIds: [],
        slowCookedIds: [],
        collapsedIds: [],
    };
}

export function getNetSaleMultiplier(settings: CraftingSettings): number {
    return 0.65 + 0.65 * (
        (settings.valuePackActive ? 0.3 : 0) +
        (settings.merchantRingActive ? 0.05 : 0) +
        settings.familyFameBonus
    );
}

function findClosestTableKey<T>(table: Record<number, T>, input: number): number {
    const keys = Object.keys(table)
        .map((key) => Number(key))
        .sort((left, right) => left - right);

    let selected = keys[0] ?? 0;
    for (const key of keys) {
        if (key > input) {
            break;
        }
        selected = key;
    }
    return selected;
}

export function getCookingMasteryEntry(mastery: number): CookingMasteryEntry {
    return COOKING_MASTERY_TABLE[findClosestTableKey(COOKING_MASTERY_TABLE, mastery)];
}

export function getAlchemyMasteryEntry(mastery: number): AlchemyMasteryEntry {
    return ALCHEMY_MASTERY_TABLE[findClosestTableKey(ALCHEMY_MASTERY_TABLE, mastery)];
}

export function getMarketSnapshot(item: CalculatorItem | null | undefined): CalculatorPriceSnapshot | null {
    return item?.prices?.[0] ?? null;
}

export function getItemWeight(item: CalculatorItem | null | undefined): number {
    const rawWeight = toNumber(item?.weight ?? 0);
    if (rawWeight > 0) {
        return rawWeight / 100;
    }
    return 0.01;
}

export function getItemPriceBreakdown(
    item: CalculatorItem | null | undefined,
    state: CraftingCalculatorState,
): PriceBreakdown {
    if (!item) {
        return {
            unitPrice: 0,
            source: 'missing',
            totalTrades: 0,
            currentStock: 0,
        };
    }

    const customPrice = state.customPrices[item.id];
    const marketSnapshot = getMarketSnapshot(item);
    const marketPrice = toNumber(marketSnapshot?.lastSoldPrice ?? marketSnapshot?.basePrice ?? 0);
    const vendorPrice = VENDOR_PRICE_MAP[item.id];
    const currentStock = Number(marketSnapshot?.currentStock ?? 0);
    const totalTrades = toNumber(marketSnapshot?.totalTrades ?? 0);

    if (customPrice !== undefined && customPrice >= 0) {
        return { unitPrice: customPrice, source: 'custom', totalTrades, currentStock };
    }

    if (marketPrice > 0) {
        return { unitPrice: marketPrice, source: 'market', totalTrades, currentStock };
    }

    if (vendorPrice !== undefined) {
        return { unitPrice: vendorPrice, source: 'vendor', totalTrades, currentStock };
    }

    return { unitPrice: 0, source: 'missing', totalTrades, currentStock };
}

function inferRangeFromAverage(average: number): { average: number; max: number } {
    const sanitizedAverage = clampNonNegative(average);
    if (sanitizedAverage === 0) {
        return { average: 0, max: 0 };
    }

    if (Number.isInteger(sanitizedAverage)) {
        return { average: sanitizedAverage, max: sanitizedAverage };
    }

    const max = Math.ceil(sanitizedAverage);
    return { average: sanitizedAverage, max };
}

function inferRareAverageOutput(recipe: CalculatorRecipe): number {
    if (!recipe.procQuantity) {
        return 0;
    }
    return recipe.procQuantity / LOCAL_PROC_BASE_CHANCE;
}

export function getRecipeRates(
    recipe: CalculatorRecipe,
    settings: CraftingSettings,
    slowCook: boolean,
    includeRareProc: boolean,
): RecipeRateResult {
    if (recipe.type === 'alchemy') {
        const mastery = settings.alchemyMastery;
        const masteryEntry = getAlchemyMasteryEntry(mastery);
        const normal = inferRangeFromAverage(recipe.resultQuantity);
        const rareAverage = inferRareAverageOutput(recipe);

        return {
            normalProcRate: normal.average + (normal.max - normal.average) * masteryEntry.maxProcChance,
            rareProcRate: includeRareProc ? rareAverage * ALCHEMY_RARE_BASE_CHANCE : 0,
            massProcRate: 1,
            timePerAction: settings.alchemyTime,
            mastery,
        };
    }

    if (recipe.type === 'cooking') {
        const mastery = slowCook ? settings.slowCookingMastery : settings.speedCookingMastery;
        const masteryEntry = getCookingMasteryEntry(mastery);
        const normal = inferRangeFromAverage(recipe.resultQuantity);
        const rare = inferRangeFromAverage(inferRareAverageOutput(recipe));

        return {
            normalProcRate: normal.average + (normal.max - normal.average) * masteryEntry.maxProcChance,
            rareProcRate: includeRareProc
                ? (rare.average + (rare.max - rare.average) * masteryEntry.maxProcChance) *
                (COOKING_RARE_BASE_CHANCE + masteryEntry.rareAdditonalChance)
                : 0,
            massProcRate: 1 + (9 * masteryEntry.massProduceChance),
            timePerAction: slowCook ? settings.slowCookingTime : settings.speedCookingTime,
            mastery,
        };
    }

    const normal = clampNonNegative(recipe.resultQuantity);
    const rare = clampNonNegative(recipe.procQuantity ?? 0);

    return {
        normalProcRate: normal,
        rareProcRate: includeRareProc ? rare : 0,
        massProcRate: 1,
        timePerAction: Math.max(recipe.cookTimeSeconds || 10, 1),
        mastery: 0,
    };
}

export function getRecipeGroupKey(recipe: CalculatorRecipe): string {
    return getRecipeVariantKey(recipe);
}

export function groupRecipes(recipes: CalculatorRecipe[]): Map<string, CalculatorRecipe[]> {
    const groups = new Map<string, CalculatorRecipe[]>();

    for (const recipe of recipes) {
        const key = getRecipeGroupKey(recipe);
        const existing = groups.get(key) ?? [];
        existing.push(recipe);
        groups.set(key, existing);
    }

    return groups;
}

function buildResultLookup(recipes: CalculatorRecipe[]): Map<number, CalculatorRecipe[]> {
    const lookup = new Map<number, CalculatorRecipe[]>();

    for (const recipe of recipes) {
        const existing = lookup.get(recipe.resultItemId) ?? [];
        existing.push(recipe);
        lookup.set(recipe.resultItemId, existing);
    }

    return lookup;
}

function buildItemLookup(recipes: CalculatorRecipe[]): Map<number, CalculatorItem> {
    const lookup = new Map<number, CalculatorItem>();

    for (const recipe of recipes) {
        lookup.set(recipe.resultItem.id, recipe.resultItem);
        if (recipe.procItem) {
            lookup.set(recipe.procItem.id, recipe.procItem);
        }

        for (const ingredient of recipe.ingredients) {
            lookup.set(ingredient.item.id, ingredient.item);
        }
    }

    return lookup;
}

function buildIngredientAlternatives(
    recipe: CalculatorRecipe,
    groupedRecipes: Map<string, CalculatorRecipe[]>,
    resultLookup: Map<number, CalculatorRecipe[]>,
): Record<number, IngredientAlternative[]> {
    const variants = groupedRecipes.get(getRecipeGroupKey(recipe)) ?? [recipe];

    return buildIngredientAlternativesBySlot<CalculatorIngredient, CalculatorRecipe, CraftingType>(
        recipe,
        variants,
        (itemId) => {
            const subRecipe = resultLookup.get(itemId)?.[0];
            return subRecipe
                ? { id: subRecipe.id, type: subRecipe.type }
                : null;
        },
    );
}

function aggregateFlatInputRows(rows: LeafInputRow[]): LeafInputRow[] {
    const byItem = new Map<number, LeafInputRow>();

    for (const row of rows) {
        const existing = byItem.get(row.itemId);
        if (!existing) {
            byItem.set(row.itemId, { ...row });
            continue;
        }

        existing.quantity += row.quantity;
        existing.totalCost += row.totalCost;
    }

    return Array.from(byItem.values()).sort((left, right) => right.totalCost - left.totalCost);
}

function average(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getPriceTrend(item: CalculatorItem | null | undefined): number | null {
    const history = item?.priceHistory ?? [];
    if (history.length === 0) {
        return null;
    }

    const current = getItemPriceBreakdown(item, getDefaultCalculatorState()).unitPrice;
    const historical = toNumber(history[history.length - 1]?.price ?? 0);
    if (current <= 0 || historical <= 0) {
        return null;
    }

    return ((current - historical) / historical) * 100;
}

export function getVolumeTrend(item: CalculatorItem | null | undefined): number | null {
    const history = item?.priceHistory ?? [];
    if (history.length < 4) {
        return null;
    }

    const midpoint = Math.floor(history.length / 2);
    const recent = history.slice(0, midpoint).map((point) => toNumber(point.volume));
    const previous = history.slice(midpoint).map((point) => toNumber(point.volume));
    const previousAverage = average(previous);

    if (previousAverage <= 0) {
        return null;
    }

    return ((average(recent) - previousAverage) / previousAverage) * 100;
}

export function getLatestDailyVolume(item: CalculatorItem | null | undefined): number {
    return toNumber(item?.priceHistory?.[0]?.volume ?? 0);
}

function buildByproductOutput(
    recipe: CalculatorRecipe,
    craftQuantity: number,
    settings: CraftingSettings,
    itemLookup: Map<number, CalculatorItem>,
    state: CraftingCalculatorState,
    saleMultiplier: number,
): OutputRow | null {
    if (recipe.type !== 'cooking' && recipe.type !== 'alchemy') {
        return null;
    }

    const usageItemId = recipe.type === 'cooking'
        ? settings.cookingByproductUsage
        : settings.alchemyByproductUsage;
    const exchangeItemId = recipe.type === 'cooking' ? 9780 : 9781;
    const quantityMultiplier = BYPRODUCT_USAGE_MAP[exchangeItemId]?.[usageItemId] ?? 1;
    const chance = recipe.type === 'cooking' ? COOKING_BYPRODUCT_CHANCE : ALCHEMY_BYPRODUCT_CHANCE;
    const quantity = craftQuantity * quantityMultiplier * chance;
    const item = itemLookup.get(usageItemId);
    const price = getItemPriceBreakdown(item, state);
    const kept = state.keptItemIds.includes(usageItemId);

    return {
        itemId: usageItemId,
        name: item?.name ?? `Item ${usageItemId}`,
        quantity,
        unitPrice: price.unitPrice,
        totalRevenue: kept ? 0 : quantity * price.unitPrice * saleMultiplier,
        kept,
        source: price.source,
        kind: 'byproduct',
        totalTrades: price.totalTrades,
        currentStock: price.currentStock,
        iconUrl: item?.iconUrl,
        grade: item?.grade,
    };
}

interface BuildRecipeTreeOptions {
    recipes: CalculatorRecipe[];
    rootRecipeId: number;
    craftQuantity: number;
    settings: CraftingSettings;
    state: CraftingCalculatorState;
    context?: BuildContext;
}

export interface BuildContext {
    groupedRecipes: Map<string, CalculatorRecipe[]>;
    resultLookup: Map<number, CalculatorRecipe[]>;
    itemLookup: Map<number, CalculatorItem>;
    settings: CraftingSettings;
    state: CraftingCalculatorState;
    saleMultiplier: number;
}

export function buildRecipeContext(options: {
    recipes: CalculatorRecipe[];
    settings: CraftingSettings;
    state: CraftingCalculatorState;
}): BuildContext {
    return {
        groupedRecipes: groupRecipes(options.recipes),
        resultLookup: buildResultLookup(options.recipes),
        itemLookup: buildItemLookup(options.recipes),
        settings: options.settings,
        state: options.state,
        saleMultiplier: getNetSaleMultiplier(options.settings),
    };
}

function selectRecipeCandidate(
    itemId: number,
    resultLookup: Map<number, CalculatorRecipe[]>,
): CalculatorRecipe | null {
    const candidates = resultLookup.get(itemId) ?? [];
    if (candidates.length === 0) {
        return null;
    }

    return [...candidates].sort((left, right) => {
        const leftScore = left.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0) / Math.max(left.resultQuantity, 1);
        const rightScore = right.ingredients.reduce((sum, ingredient) => sum + ingredient.quantity, 0) / Math.max(right.resultQuantity, 1);
        return leftScore - rightScore || left.id - right.id;
    })[0];
}

function buildMaterialNode(
    option: IngredientAlternative,
    requestedQuantity: number,
    parentRecipeId: number,
    state: CraftingCalculatorState,
    saleMultiplier: number,
): RecipeTreeNode {
    const price = getItemPriceBreakdown(option.item, state);
    const taxed = state.taxedItemIds.includes(option.itemId);
    const totalCost = requestedQuantity * price.unitPrice * (taxed ? saleMultiplier : 1);

    return {
        key: `material:${parentRecipeId}:${option.itemId}`,
        recipeId: null,
        itemId: option.itemId,
        parentRecipeId,
        name: option.item.name,
        type: 'material',
        craftingType: null,
        quantityPerCraft: option.quantity,
        requestedQuantity,
        craftQuantity: 0,
        normalProcQuantity: requestedQuantity,
        rareProcQuantity: 0,
        totalTime: 0,
        individualTime: 0,
        craftingCost: totalCost,
        totalRevenue: 0,
        craftingProfit: -totalCost,
        profitPerHour: 0,
        displayedProfitPerHour: 0,
        outputs: [],
        children: [],
        leftover: [],
        ingredientAlternatives: {},
        unitPrice: price.unitPrice,
        priceSource: price.source,
        iconUrl: option.item.iconUrl,
        grade: option.item.grade,
        isTradeable: option.item.isTradeable,
    };
}

function buildRecipeNode(
    recipe: CalculatorRecipe,
    requestedCraftQuantity: number,
    parentRecipeId: number | null,
    context: BuildContext,
    trail: Set<number>,
): RecipeTreeNode {
    const ingredientAlternatives = buildIngredientAlternatives(recipe, context.groupedRecipes, context.resultLookup);
    const slowCook = recipe.type === 'cooking' && context.state.slowCookedIds.includes(recipe.id);
    const includeRareProc = !context.state.useRareProcIds.includes(recipe.id);
    const rates = getRecipeRates(recipe, context.settings, slowCook, includeRareProc);
    const craftQuantity = requestedCraftQuantity;
    const normalProcQuantity = craftQuantity * rates.normalProcRate;
    const rareProcQuantity = craftQuantity * rates.rareProcRate;
    const totalTime = craftQuantity / Math.max(rates.massProcRate, 1) * rates.timePerAction;

    const outputs: OutputRow[] = [];
    const mainPrice = getItemPriceBreakdown(recipe.resultItem, context.state);
    const mainKept = context.state.keptItemIds.includes(recipe.resultItemId);
    outputs.push({
        itemId: recipe.resultItemId,
        name: recipe.resultItem.name,
        quantity: normalProcQuantity,
        unitPrice: mainPrice.unitPrice,
        totalRevenue: mainKept ? 0 : normalProcQuantity * mainPrice.unitPrice * context.saleMultiplier,
        kept: mainKept,
        source: mainPrice.source,
        kind: 'normal',
        totalTrades: mainPrice.totalTrades,
        currentStock: mainPrice.currentStock,
        iconUrl: recipe.resultItem.iconUrl,
        grade: recipe.resultItem.grade,
    });

    if (recipe.procItemId && recipe.procItem && rareProcQuantity > 0) {
        const rarePrice = getItemPriceBreakdown(recipe.procItem, context.state);
        const rareKept = context.state.keptItemIds.includes(recipe.procItemId);
        outputs.push({
            itemId: recipe.procItemId,
            name: recipe.procItem.name,
            quantity: rareProcQuantity,
            unitPrice: rarePrice.unitPrice,
            totalRevenue: rareKept ? 0 : rareProcQuantity * rarePrice.unitPrice * context.saleMultiplier,
            kept: rareKept,
            source: rarePrice.source,
            kind: 'rare',
            totalTrades: rarePrice.totalTrades,
            currentStock: rarePrice.currentStock,
            iconUrl: recipe.procItem.iconUrl,
            grade: recipe.procItem.grade,
        });
    }

    const byproductOutput = buildByproductOutput(
        recipe,
        craftQuantity,
        context.settings,
        context.itemLookup,
        context.state,
        context.saleMultiplier,
    );

    if (byproductOutput) {
        outputs.push(byproductOutput);
    }

    const children = recipe.ingredients.map((ingredient, index) => {
        const alternatives = ingredientAlternatives[index] ?? [];
        const selectedItemId = context.state.selectedMaterials[recipe.id]?.[index];
        const selected = alternatives.find((option) => option.itemId === selectedItemId) ?? alternatives[0] ?? {
            ...ingredient,
            subRecipeId: null,
            subRecipeType: null,
        };
        const requestedQuantity = craftQuantity * selected.quantity;
        const candidateRecipe = selectRecipeCandidate(selected.itemId, context.resultLookup);

        if (!candidateRecipe || trail.has(candidateRecipe.id)) {
            return buildMaterialNode(selected, requestedQuantity, recipe.id, context.state, context.saleMultiplier);
        }

        trail.add(candidateRecipe.id);
        const childRates = getRecipeRates(
            candidateRecipe,
            context.settings,
            candidateRecipe.type === 'cooking' && context.state.slowCookedIds.includes(candidateRecipe.id),
            !context.state.useRareProcIds.includes(candidateRecipe.id),
        );
        const childCraftQuantity = requestedQuantity / Math.max(childRates.normalProcRate, 0.0001);
        const childNode = buildRecipeNode(candidateRecipe, childCraftQuantity, recipe.id, context, trail);
        trail.delete(candidateRecipe.id);
        return childNode;
    });

    const craftingCost = children.reduce((sum, child) => sum + child.craftingCost, 0);
    const totalRevenue = outputs.reduce((sum, output) => sum + output.totalRevenue, 0);
    const craftingProfit = totalRevenue - craftingCost;
    const profitPerHour = totalTime > 0 ? (craftingProfit / totalTime) * 3600 : 0;

    return {
        key: `recipe:${recipe.id}:${parentRecipeId ?? 'root'}`,
        recipeId: recipe.id,
        itemId: recipe.resultItemId,
        parentRecipeId,
        name: recipe.name,
        type: 'recipe',
        craftingType: recipe.type,
        quantityPerCraft: recipe.resultQuantity,
        requestedQuantity: normalProcQuantity,
        craftQuantity,
        normalProcQuantity,
        rareProcQuantity,
        totalTime,
        individualTime: rates.timePerAction,
        craftingCost,
        totalRevenue,
        craftingProfit,
        profitPerHour,
        displayedProfitPerHour: profitPerHour,
        outputs,
        children,
        leftover: [],
        ingredientAlternatives,
        unitPrice: mainPrice.unitPrice,
        priceSource: mainPrice.source,
        iconUrl: recipe.resultItem.iconUrl,
        grade: recipe.resultItem.grade,
        isTradeable: recipe.resultItem.isTradeable,
    };
}

export function buildRecipeTree(options: BuildRecipeTreeOptions): RecipeTreeNode | null {
    const rootRecipe = options.recipes.find((recipe) => recipe.id === options.rootRecipeId);
    if (!rootRecipe) {
        return null;
    }

    const context = options.context ?? buildRecipeContext({
        recipes: options.recipes,
        settings: options.settings,
        state: options.state,
    });

    return buildRecipeNode(rootRecipe, options.craftQuantity, null, context, new Set([rootRecipe.id]));
}

export function flattenLeafInputs(node: RecipeTreeNode, state: CraftingCalculatorState): LeafInputRow[] {
    if (node.type === 'material') {
        return [];
    }

    const rows: LeafInputRow[] = [];

    const walk = (current: RecipeTreeNode): void => {
        if (current.type === 'material') {
            return;
        }

        for (const child of current.children) {
            if (child.type === 'material') {
                const taxed = state.taxedItemIds.includes(child.itemId);
                rows.push({
                    itemId: child.itemId,
                    name: child.name,
                    quantity: child.requestedQuantity,
                    unitPrice: child.requestedQuantity > 0 ? child.craftingCost / child.requestedQuantity : 0,
                    totalCost: child.craftingCost,
                    taxed,
                    source: getDefaultCalculatorState().customPrices[child.itemId] !== undefined ? 'custom' : 'market',
                    totalTrades: 0,
                    currentStock: 0,
                    weightPerUnit: 0.01,
                });
                continue;
            }
            walk(child);
        }
    };

    walk(node);
    return aggregateFlatInputRows(rows);
}

export function flattenLeafInputsWithLookup(
    node: RecipeTreeNode,
    recipes: CalculatorRecipe[],
    state: CraftingCalculatorState,
    itemLookup?: Map<number, CalculatorItem>,
): LeafInputRow[] {
    const resolvedItemLookup = itemLookup ?? buildItemLookup(recipes);
    const baseRows = flattenLeafInputs(node, state);

    return baseRows.map((row) => {
        const item = resolvedItemLookup.get(row.itemId);
        const price = getItemPriceBreakdown(item, state);
        return {
            ...row,
            unitPrice: price.unitPrice,
            source: price.source,
            totalTrades: price.totalTrades,
            currentStock: price.currentStock,
            iconUrl: item?.iconUrl,
            grade: item?.grade,
            weightPerUnit: getItemWeight(item),
        };
    });
}

export function getWeightSummary(
    inputs: LeafInputRow[],
    craftQuantity: number,
    settings: CraftingSettings,
): {
    availableWeight: number;
    totalWeight: number;
    weightPerCraft: number;
    maxCrafts: number;
} {
    const totalWeight = inputs.reduce((sum, input) => sum + (input.quantity * input.weightPerUnit), 0);
    const weightPerCraft = craftQuantity > 0 ? totalWeight / craftQuantity : 0;
    const availableWeight = Math.max(settings.weight - settings.usedWeight, 0);
    const maxCrafts = weightPerCraft > 0 ? Math.floor(availableWeight / weightPerCraft) : 0;

    return {
        availableWeight,
        totalWeight,
        weightPerCraft,
        maxCrafts,
    };
}

export function chooseBestVariant(
    variants: CalculatorRecipe[],
    allRecipes: CalculatorRecipe[],
    settings: CraftingSettings,
    state: CraftingCalculatorState,
    context?: BuildContext,
): CalculatorRecipe {
    const recipeContext = context ?? buildRecipeContext({
        recipes: allRecipes,
        settings,
        state,
    });
    let selected = variants[0];
    let bestSilverPerHour = Number.NEGATIVE_INFINITY;

    for (const variant of variants) {
        const tree = buildRecipeTree({
            recipes: allRecipes,
            rootRecipeId: variant.id,
            craftQuantity: 1000,
            settings,
            state,
            context: recipeContext,
        });

        const score = tree?.profitPerHour ?? Number.NEGATIVE_INFINITY;
        if (score > bestSilverPerHour) {
            bestSilverPerHour = score;
            selected = variant;
        }
    }

    return selected;
}

export function buildOverviewRows(
    recipes: CalculatorRecipe[],
    type: 'cooking' | 'alchemy',
    settings: CraftingSettings,
    state: CraftingCalculatorState,
): RecipeOverviewRow[] {
    const context = buildRecipeContext({ recipes, settings, state });
    const relevantRecipes = recipes.filter((recipe) => recipe.type === type);
    const groups = groupRecipes(relevantRecipes);
    const rows: RecipeOverviewRow[] = [];

    for (const variants of groups.values()) {
        const recipe = chooseBestVariant(variants, recipes, settings, state, context);
        const tree = buildRecipeTree({
            recipes,
            rootRecipeId: recipe.id,
            craftQuantity: 1000,
            settings,
            state,
            context,
        });

        rows.push({
            id: recipe.id,
            name: recipe.name,
            recipe,
            possibleInputs: Array.from(new Set(variants.flatMap((variant) => variant.ingredients.map((ingredient) => ingredient.item.name)))),
            marketPrice: getItemPriceBreakdown(recipe.resultItem, state).unitPrice,
            silverPerHour: tree?.profitPerHour ?? 0,
            priceChange: getPriceTrend(recipe.resultItem),
            dailyVolume: getLatestDailyVolume(recipe.resultItem),
            volumeChange: getVolumeTrend(recipe.resultItem),
            experience: recipe.experience,
            favorite: state.favoriteIds[type].includes(recipe.id),
        });
    }

    return rows;
}

export function getFavoriteCount(type: 'cooking' | 'alchemy', state: CraftingCalculatorState): number {
    return state.favoriteIds[type].length;
}

export function formatRecipeTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function getGradeClass(grade: number | null | undefined): string {
    switch (grade) {
        case 1:
            return 'grade-green';
        case 2:
            return 'grade-blue';
        case 3:
            return 'grade-yellow';
        case 4:
            return 'grade-orange';
        default:
            return 'grade-white';
    }
}

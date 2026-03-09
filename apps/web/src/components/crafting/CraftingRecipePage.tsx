'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { trpc } from '@/lib/trpc';
import {
    buildRecipeContext,
    buildRecipeTree,
    flattenLeafInputsWithLookup,
    getItemPriceBreakdown,
    getWeightSummary,
    mapGlobalSettingsToCraftingSettings,
    toNumber,
    type CalculatorItem,
    type CalculatorRecipe,
    type CraftingCalculatorState,
    type GlobalSettingsShape,
} from '@/lib/crafting/calculator';
import {
    useCraftingCalculatorStore,
    type CraftingCalculatorStore,
} from '@/stores/crafting-calculator-store';
import {
    useGlobalSettings,
    type GlobalSettings,
} from '@/stores/global-settings-store';
import { CraftingRecipeHeader } from './CraftingRecipeHeader';
import { CraftingRecipeMainPanel } from './CraftingRecipeMainPanel';
import { CraftingRecipeSidebarPanel } from './CraftingRecipeSidebarPanel';
import {
    CraftingRecipeLoadingState,
    CraftingRecipeNotFoundState,
} from './CraftingRecipeStates';
import { type DetailTab } from './CraftingRecipeTabs';

interface CraftingRecipePageProps {
    recipeId: number;
}

const selectCalculatorState = (state: CraftingCalculatorStore): CraftingCalculatorState => ({
    customPrices: state.customPrices,
    taxedItemIds: state.taxedItemIds,
    keptItemIds: state.keptItemIds,
    favoriteIds: state.favoriteIds,
    craftQuantities: state.craftQuantities,
    selectedMaterials: state.selectedMaterials,
    useRareProcIds: state.useRareProcIds,
    slowCookedIds: state.slowCookedIds,
    collapsedIds: state.collapsedIds,
});

const selectCalculatorActions = (state: CraftingCalculatorStore) => ({
    setCraftQuantity: state.setCraftQuantity,
    toggleSlowCook: state.toggleSlowCook,
    toggleTaxedItem: state.toggleTaxedItem,
    setCustomPrice: state.setCustomPrice,
    toggleKeptItem: state.toggleKeptItem,
    toggleCollapsed: state.toggleCollapsed,
    toggleRareProc: state.toggleRareProc,
    setSelectedMaterial: state.setSelectedMaterial,
});

const selectCraftingGlobalSettings = (state: GlobalSettings): GlobalSettingsShape => ({
    hasValuePack: state.hasValuePack,
    hasMerchantRing: state.hasMerchantRing,
    familyFameBonus: state.familyFameBonus,
    weight: state.weight,
    usedWeight: state.usedWeight,
    speedCookingMastery: state.speedCookingMastery,
    speedCookingTime: state.speedCookingTime,
    slowCookingMastery: state.slowCookingMastery,
    slowCookingTime: state.slowCookingTime,
    cookingByproductUsage: state.cookingByproductUsage,
    alchemyMastery: state.alchemyMastery,
    alchemyTimeSeconds: state.alchemyTimeSeconds,
    alchemyByproductUsage: state.alchemyByproductUsage,
});

export function CraftingRecipePage({ recipeId }: CraftingRecipePageProps) {
    const router = useRouter();
    const settings = useGlobalSettings(useShallow(selectCraftingGlobalSettings));
    const calculatorState = useCraftingCalculatorStore(useShallow(selectCalculatorState));
    const {
        customPrices,
        taxedItemIds,
        keptItemIds,
        craftQuantities,
        useRareProcIds,
        slowCookedIds,
        collapsedIds,
    } = calculatorState;
    const {
        setCraftQuantity,
        toggleSlowCook,
        toggleTaxedItem,
        setCustomPrice,
        toggleKeptItem,
        toggleCollapsed,
        toggleRareProc,
        setSelectedMaterial,
    } = useCraftingCalculatorStore(useShallow(selectCalculatorActions));
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [showSettings, setShowSettings] = useState(false);
    const { data: recipeData, isLoading } = trpc.recipe.getById.useQuery({ recipeId });

    const recipe = recipeData as CalculatorRecipe | undefined;
    const supportItems = useMemo(
        () => ((recipeData?.supportItems ?? []) as CalculatorItem[]),
        [recipeData],
    );
    const treeRecipes = useMemo(() => {
        if (!recipeData) {
            return [] as CalculatorRecipe[];
        }

        const baseRecipe = recipeData as CalculatorRecipe;
        const relatedRecipes = (recipeData.treeRecipes ?? []) as CalculatorRecipe[];

        return relatedRecipes.some((entry) => entry.id === baseRecipe.id)
            ? relatedRecipes
            : [baseRecipe, ...relatedRecipes];
    }, [recipeData]);

    const craftingSettings = useMemo(
        () => mapGlobalSettingsToCraftingSettings(settings),
        [settings],
    );

    const craftQuantity = craftQuantities[recipeId] ?? 1000;
    const recipeContext = useMemo(
        () => (treeRecipes.length > 0
            ? buildRecipeContext({
                recipes: treeRecipes,
                supportItems,
                settings: craftingSettings,
                state: calculatorState,
            })
            : null),
        [calculatorState, craftingSettings, supportItems, treeRecipes],
    );

    const tree = useMemo(() => {
        if (!recipe || treeRecipes.length === 0 || !recipeContext) {
            return null;
        }

        return buildRecipeTree({
            recipes: treeRecipes,
            rootRecipeId: recipe.id,
            craftQuantity,
            settings: craftingSettings,
            state: calculatorState,
            context: recipeContext,
        });
    }, [calculatorState, craftQuantity, craftingSettings, recipe, recipeContext, treeRecipes]);

    const leafInputs = useMemo(
        () => tree && recipeContext
            ? flattenLeafInputsWithLookup(tree, treeRecipes, calculatorState, recipeContext.itemLookup)
            : [],
        [calculatorState, recipeContext, tree, treeRecipes],
    );

    const weightSummary = useMemo(
        () => getWeightSummary(leafInputs, craftQuantity, craftingSettings),
        [craftQuantity, craftingSettings, leafInputs],
    );

    const historyData = useMemo(() => (
        recipe?.resultItem.priceHistory?.slice().reverse().map((point) => ({
            date: new Date(point.recordedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            price: toNumber(point.price),
            volume: toNumber(point.volume),
        })) ?? []
    ), [recipe?.resultItem.priceHistory]);

    const profitChartData = tree ? [
        { label: 'Custo', value: tree.craftingCost },
        { label: 'Receita', value: tree.totalRevenue },
        { label: 'Lucro', value: tree.craftingProfit },
    ] : [];

    if (isLoading) {
        return <CraftingRecipeLoadingState />;
    }

    if (!recipe || !tree) {
        return <CraftingRecipeNotFoundState onBack={() => router.back()} />;
    }

    const resultPriceBreakdown = getItemPriceBreakdown(recipe.resultItem, calculatorState);

    return (
        <div className="flex flex-col gap-6 pb-24">
            <CraftingRecipeHeader
                recipeName={recipe.name}
                recipeType={recipe.type}
                resultQuantity={recipe.resultQuantity}
                resultItemGrade={recipe.resultItem.grade}
                resultItemIconUrl={recipe.resultItem.iconUrl}
                resultPrice={resultPriceBreakdown.unitPrice}
                resultPriceSource={resultPriceBreakdown.source}
                craftQuantity={craftQuantity}
                slowCookEnabled={slowCookedIds.includes(recipeId)}
                showSettings={showSettings}
                onBack={() => router.back()}
                onCraftQuantityChange={(value) => setCraftQuantity(recipeId, value)}
                onToggleSlowCook={() => toggleSlowCook(recipeId)}
                onToggleShowSettings={() => setShowSettings((current) => !current)}
            />

            <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,0.93fr)_minmax(390px,460px)] 2xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,500px)]">
                <CraftingRecipeMainPanel
                    activeTab={activeTab}
                    onActiveTabChange={setActiveTab}
                    summaryClassName="xl:hidden"
                    detailContentProps={{
                        leafInputs,
                        customPrices,
                        taxedItemIds,
                        keptItemIds,
                        tree,
                        weightSummary,
                        historyData,
                        profitChartData,
                        onToggleTaxedItem: toggleTaxedItem,
                        onToggleKeptItem: toggleKeptItem,
                        onSetCustomPrice: setCustomPrice,
                    }}
                />

                <CraftingRecipeSidebarPanel
                    tree={tree}
                    recipeType={recipe.type}
                    showSettings={showSettings}
                    node={tree}
                    onToggleCollapse={toggleCollapsed}
                    onToggleRareProc={toggleRareProc}
                    onToggleSlowCook={toggleSlowCook}
                    onSelectMaterial={setSelectedMaterial}
                    collapsedIds={collapsedIds}
                    useRareProcIds={useRareProcIds}
                    slowCookedIds={slowCookedIds}
                />
            </div>
        </div>
    );
}

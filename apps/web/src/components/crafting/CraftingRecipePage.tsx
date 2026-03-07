'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TreePine } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
    buildRecipeContext,
    buildRecipeTree,
    flattenLeafInputsWithLookup,
    getItemPriceBreakdown,
    getWeightSummary,
    mapGlobalSettingsToCraftingSettings,
    toNumber,
    type CalculatorRecipe,
    type CraftingCalculatorState,
} from '@/lib/crafting/calculator';
import { useCraftingCalculatorStore } from '@/stores/crafting-calculator-store';
import { useGlobalSettings } from '@/stores/global-settings-store';
import { DetailSummaryGrid, DetailTabContent } from './CraftingRecipeDetailSections';
import { CraftingRecipeHeader } from './CraftingRecipeHeader';
import { SettingsPanel, TreeNodeView } from './CraftingRecipeSidebarSections';
import {
    CraftingRecipeLoadingState,
    CraftingRecipeNotFoundState,
} from './CraftingRecipeStates';
import { type DetailTab, DetailTabsHeader } from './CraftingRecipeTabs';

interface CraftingRecipePageProps {
    recipeId: number;
}

export function CraftingRecipePage({ recipeId }: CraftingRecipePageProps) {
    const router = useRouter();
    const settings = useGlobalSettings();
    const customPrices = useCraftingCalculatorStore((state) => state.customPrices);
    const taxedItemIds = useCraftingCalculatorStore((state) => state.taxedItemIds);
    const keptItemIds = useCraftingCalculatorStore((state) => state.keptItemIds);
    const favoriteIds = useCraftingCalculatorStore((state) => state.favoriteIds);
    const craftQuantities = useCraftingCalculatorStore((state) => state.craftQuantities);
    const selectedMaterials = useCraftingCalculatorStore((state) => state.selectedMaterials);
    const useRareProcIds = useCraftingCalculatorStore((state) => state.useRareProcIds);
    const slowCookedIds = useCraftingCalculatorStore((state) => state.slowCookedIds);
    const collapsedIds = useCraftingCalculatorStore((state) => state.collapsedIds);
    const setCraftQuantity = useCraftingCalculatorStore((state) => state.setCraftQuantity);
    const toggleSlowCook = useCraftingCalculatorStore((state) => state.toggleSlowCook);
    const toggleTaxedItem = useCraftingCalculatorStore((state) => state.toggleTaxedItem);
    const setCustomPrice = useCraftingCalculatorStore((state) => state.setCustomPrice);
    const toggleKeptItem = useCraftingCalculatorStore((state) => state.toggleKeptItem);
    const toggleCollapsed = useCraftingCalculatorStore((state) => state.toggleCollapsed);
    const toggleRareProc = useCraftingCalculatorStore((state) => state.toggleRareProc);
    const setSelectedMaterial = useCraftingCalculatorStore((state) => state.setSelectedMaterial);
    const [activeTab, setActiveTab] = useState<DetailTab>('inputs');
    const [showSettings, setShowSettings] = useState(false);
    const { data: recipeData, isLoading } = trpc.recipe.getById.useQuery({ recipeId });

    const recipe = recipeData as CalculatorRecipe | undefined;
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

    const calculatorState = useMemo<CraftingCalculatorState>(() => ({
        customPrices,
        taxedItemIds,
        keptItemIds,
        favoriteIds,
        craftQuantities,
        selectedMaterials,
        useRareProcIds,
        slowCookedIds,
        collapsedIds,
    }), [
        collapsedIds,
        craftQuantities,
        customPrices,
        favoriteIds,
        keptItemIds,
        selectedMaterials,
        slowCookedIds,
        taxedItemIds,
        useRareProcIds,
    ]);

    const craftQuantity = craftQuantities[recipeId] ?? 1000;
    const recipeContext = useMemo(
        () => (treeRecipes.length > 0
            ? buildRecipeContext({ recipes: treeRecipes, settings: craftingSettings, state: calculatorState })
            : null),
        [calculatorState, craftingSettings, treeRecipes],
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

    const resultPrice = getItemPriceBreakdown(recipe.resultItem, calculatorState).unitPrice;

    return (
        <div className="flex flex-col gap-6 pb-24">
            <CraftingRecipeHeader
                recipeName={recipe.name}
                recipeType={recipe.type}
                resultQuantity={recipe.resultQuantity}
                resultItemGrade={recipe.resultItem.grade}
                resultItemIconUrl={recipe.resultItem.iconUrl}
                resultPrice={resultPrice}
                craftQuantity={craftQuantity}
                slowCookEnabled={slowCookedIds.includes(recipeId)}
                showSettings={showSettings}
                onBack={() => router.back()}
                onCraftQuantityChange={(value) => setCraftQuantity(recipeId, value)}
                onToggleSlowCook={() => toggleSlowCook(recipeId)}
                onToggleShowSettings={() => setShowSettings((current) => !current)}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_420px]">
                <div className="space-y-6">
                    <div className="card overflow-hidden">
                        <DetailTabsHeader activeTab={activeTab} onChange={setActiveTab} />

                        <div className="p-4">
                            <DetailTabContent
                                activeTab={activeTab}
                                leafInputs={leafInputs}
                                customPrices={customPrices}
                                taxedItemIds={taxedItemIds}
                                keptItemIds={keptItemIds}
                                tree={tree}
                                weightSummary={weightSummary}
                                historyData={historyData}
                                profitChartData={profitChartData}
                                onToggleTaxedItem={toggleTaxedItem}
                                onToggleKeptItem={toggleKeptItem}
                                onSetCustomPrice={setCustomPrice}
                            />
                        </div>

                        <DetailSummaryGrid tree={tree} />
                    </div>
                </div>

                <div className="space-y-6">
                    {showSettings ? (
                        <SettingsPanel type={recipe.type === 'alchemy' ? 'alchemy' : 'cooking'} />
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
                                <h3 className="mb-4 text-sm font-semibold text-primary flex items-center gap-2">
                                    <TreePine size={16} className="text-gold" />
                                    Árvore da Receita
                                </h3>

                                <TreeNodeView
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
                    )}
                </div>
            </div>
        </div>
    );
}

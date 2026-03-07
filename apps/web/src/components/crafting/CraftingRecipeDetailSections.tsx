'use client';

import {
    formatRecipeTime,
    getWeightSummary,
    type CraftingCalculatorState,
    type LeafInputRow,
    type RecipeTreeNode,
} from '@/lib/crafting/calculator';
import { AnalyticsPanel } from './CraftingRecipeAnalyticsPanel';
import { type HistoryPoint, type ProfitChartPoint, formatSilver } from './CraftingRecipeDetailShared';
import { OverviewPanel } from './CraftingRecipeOverviewPanel';
import type { DetailTab } from './CraftingRecipeTabs';
import { WeightPanel } from './CraftingRecipeWeightPanel';

export function DetailSummaryGrid({ tree }: { tree: RecipeTreeNode }) {
    return (
        <div className="grid gap-px border-t border-border bg-border md:grid-cols-4">
            <div className="bg-bg-hover/10 p-4">
                <p className="text-[11px] uppercase tracking-wider text-secondary">Custo</p>
                <p className="mt-1 font-mono text-lg text-loss">{formatSilver(tree.craftingCost)}</p>
            </div>
            <div className="bg-bg-hover/10 p-4">
                <p className="text-[11px] uppercase tracking-wider text-secondary">Lucro</p>
                <p className={`mt-1 font-mono text-lg ${tree.craftingProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatSilver(tree.craftingProfit)}
                </p>
            </div>
            <div className="bg-bg-hover/10 p-4">
                <p className="text-[11px] uppercase tracking-wider text-secondary">Lucro / h</p>
                <p className={`mt-1 font-mono text-lg ${tree.profitPerHour >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatSilver(tree.profitPerHour)}
                </p>
            </div>
            <div className="bg-bg-hover/10 p-4">
                <p className="text-[11px] uppercase tracking-wider text-secondary">Tempo</p>
                <p className="mt-1 font-mono text-lg text-info">{formatRecipeTime(tree.totalTime)}</p>
            </div>
        </div>
    );
}

export function DetailTabContent({
    activeTab,
    leafInputs,
    customPrices,
    taxedItemIds,
    keptItemIds,
    tree,
    weightSummary,
    historyData,
    profitChartData,
    onToggleTaxedItem,
    onToggleKeptItem,
    onSetCustomPrice,
}: {
    activeTab: DetailTab;
    leafInputs: LeafInputRow[];
    customPrices: CraftingCalculatorState['customPrices'];
    taxedItemIds: number[];
    keptItemIds: number[];
    tree: RecipeTreeNode;
    weightSummary: ReturnType<typeof getWeightSummary>;
    historyData: HistoryPoint[];
    profitChartData: ProfitChartPoint[];
    onToggleTaxedItem: (itemId: number) => void;
    onToggleKeptItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    if (activeTab === 'overview') {
        return (
            <OverviewPanel
                leafInputs={leafInputs}
                customPrices={customPrices}
                taxedItemIds={taxedItemIds}
                keptItemIds={keptItemIds}
                tree={tree}
                onToggleTaxedItem={onToggleTaxedItem}
                onToggleKeptItem={onToggleKeptItem}
                onSetCustomPrice={onSetCustomPrice}
            />
        );
    }

    if (activeTab === 'analytics') {
        return <AnalyticsPanel tree={tree} historyData={historyData} profitChartData={profitChartData} />;
    }

    return <WeightPanel leafInputs={leafInputs} weightSummary={weightSummary} />;
}
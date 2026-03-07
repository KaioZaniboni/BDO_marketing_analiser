'use client';

import type { ComponentProps } from 'react';
import { DetailSummaryGrid, DetailTabContent } from './CraftingRecipeDetailSections';
import { type DetailTab, DetailTabsHeader } from './CraftingRecipeTabs';

type DetailContentProps = Omit<ComponentProps<typeof DetailTabContent>, 'activeTab'>;

interface CraftingRecipeMainPanelProps {
    activeTab: DetailTab;
    onActiveTabChange: (tab: DetailTab) => void;
    detailContentProps: DetailContentProps;
}

export function CraftingRecipeMainPanel({
    activeTab,
    onActiveTabChange,
    detailContentProps,
}: CraftingRecipeMainPanelProps) {
    return (
        <div className="card overflow-hidden">
            <DetailTabsHeader activeTab={activeTab} onChange={onActiveTabChange} />

            <div className="p-4">
                <DetailTabContent activeTab={activeTab} {...detailContentProps} />
            </div>

            <DetailSummaryGrid tree={detailContentProps.tree} />
        </div>
    );
}
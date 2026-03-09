'use client';

import type { ComponentProps } from 'react';
import { DetailSummaryGrid, DetailTabContent } from './CraftingRecipeDetailSections';
import { type DetailTab, DetailTabsHeader } from './CraftingRecipeTabs';

type DetailContentProps = Omit<ComponentProps<typeof DetailTabContent>, 'activeTab'>;

interface CraftingRecipeMainPanelProps {
    activeTab: DetailTab;
    onActiveTabChange: (tab: DetailTab) => void;
    detailContentProps: DetailContentProps;
    summaryClassName?: string;
}

export function CraftingRecipeMainPanel({
    activeTab,
    onActiveTabChange,
    detailContentProps,
    summaryClassName,
}: CraftingRecipeMainPanelProps) {
    return (
        <div className="card min-w-0 overflow-hidden">
            <DetailTabsHeader activeTab={activeTab} onChange={onActiveTabChange} />

            <div className="p-4">
                <DetailTabContent activeTab={activeTab} {...detailContentProps} />
            </div>

            <DetailSummaryGrid tree={detailContentProps.tree} className={summaryClassName} />
        </div>
    );
}

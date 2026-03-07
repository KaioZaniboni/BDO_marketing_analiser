'use client';

import { TreePine } from 'lucide-react';
import {
    TreeNodeView,
    type TreeNodeViewProps,
} from './CraftingRecipeSidebarSections';

export type CraftingRecipeTreePanelProps = TreeNodeViewProps;

export function CraftingRecipeTreePanel(props: CraftingRecipeTreePanelProps) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                    <TreePine size={16} className="text-gold" />
                    Árvore da Receita
                </h3>

                <TreeNodeView {...props} />
            </div>
        </div>
    );
}
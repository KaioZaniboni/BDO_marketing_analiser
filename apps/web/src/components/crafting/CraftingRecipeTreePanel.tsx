'use client';

import { TreePine } from 'lucide-react';
import {
    TreeNodeView,
    type TreeNodeViewProps,
} from './CraftingRecipeSidebarSections';

export type CraftingRecipeTreePanelProps = TreeNodeViewProps;

export function CraftingRecipeTreePanel(props: CraftingRecipeTreePanelProps) {
    const shouldHideRoot = props.node.type === 'recipe' && props.node.parentRecipeId === null;

    return (
        <section className="overflow-hidden rounded-3xl border border-border bg-bg-hover/8 shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-5 py-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <TreePine size={16} className="text-gold" />
                    Árvore de produção
                </h3>
                <p className="mt-2 text-xs leading-5 text-secondary">
                    Sub-receitas, materiais alternativos e ajustes por nó resolvidos para o lote atual.
                </p>
            </div>

            <div className="recipe-tree-panel-body xl:max-h-[calc(100vh-24rem)] xl:overflow-y-auto">
                <ol className="recipe-tree-list" role="list">
                    <TreeNodeView {...props} depth={shouldHideRoot ? -1 : props.depth} />
                </ol>
            </div>
        </section>
    );
}

'use client';

import {
    CircleDollarSign,
    Clock3,
    TrendingUp,
    type LucideIcon,
} from 'lucide-react';
import {
    formatRecipeTime,
    type CraftingType,
    type RecipeTreeNode,
} from '@/lib/crafting/calculator';
import { formatSilver } from './CraftingRecipeDetailShared';
import {
    SettingsPanel,
    type TreeNodeViewProps,
} from './CraftingRecipeSidebarSections';
import { CraftingRecipeTreePanel } from './CraftingRecipeTreePanel';

interface CraftingRecipeSidebarPanelProps extends TreeNodeViewProps {
    tree: RecipeTreeNode;
    recipeType: CraftingType;
    showSettings: boolean;
}

function SidebarMetricCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone: string;
}) {
    return (
        <div className="rounded-2xl border border-border/70 bg-bg-primary/45 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
                <Icon size={14} className="text-gold" />
                <span>{label}</span>
            </div>
            <p className={`mt-3.5 font-mono text-lg font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

function SidebarDetailRow({
    label,
    value,
    tone = 'text-primary',
}: {
    label: string;
    value: string;
    tone?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
            <dt className="text-xs text-secondary">{label}</dt>
            <dd className={`font-mono text-sm font-semibold ${tone}`}>{value}</dd>
        </div>
    );
}

function formatQuantity(value: number, maximumFractionDigits = 1): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits });
}

export function CraftingRecipeSidebarPanel({
    tree,
    recipeType,
    showSettings,
    ...treeProps
}: CraftingRecipeSidebarPanelProps) {
    const expectedOutput = tree.normalProcQuantity + tree.rareProcQuantity;

    return (
        <aside className="space-y-5 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-3xl border border-border bg-bg-hover/10 shadow-[var(--shadow-card)]">
                <div className="border-b border-border/80 px-5 py-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Resumo do lote</p>
                    <h2 className="mt-2.5 text-base font-semibold text-primary">Indicadores principais</h2>
                    <p className="mt-2 text-xs leading-5 text-secondary">
                        Custos, retorno e tempo calculados para a quantidade atual da receita.
                    </p>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <SidebarMetricCard
                        icon={CircleDollarSign}
                        label="Custo"
                        value={formatSilver(tree.craftingCost)}
                        tone="text-loss"
                    />
                    <SidebarMetricCard
                        icon={TrendingUp}
                        label="Lucro"
                        value={formatSilver(tree.craftingProfit)}
                        tone={tree.craftingProfit >= 0 ? 'text-profit' : 'text-loss'}
                    />
                    <SidebarMetricCard
                        icon={TrendingUp}
                        label="Lucro / h"
                        value={formatSilver(tree.profitPerHour)}
                        tone={tree.profitPerHour >= 0 ? 'text-profit' : 'text-loss'}
                    />
                    <SidebarMetricCard
                        icon={Clock3}
                        label="Tempo"
                        value={formatRecipeTime(tree.totalTime)}
                        tone="text-info"
                    />
                </div>

                <dl className="divide-y divide-border border-t border-border/80">
                    <SidebarDetailRow label="Crafts planejados" value={formatQuantity(tree.craftQuantity)} />
                    <SidebarDetailRow label="Saída esperada" value={formatQuantity(expectedOutput)} />
                    <SidebarDetailRow
                        label="Receita bruta"
                        value={formatSilver(tree.totalRevenue)}
                        tone="text-profit"
                    />
                    <SidebarDetailRow
                        label="Tipo de cálculo"
                        value={recipeType === 'alchemy' ? 'Alquimia' : 'Culinária'}
                        tone="text-gold"
                    />
                </dl>
            </section>

            {showSettings ? (
                <SettingsPanel type={recipeType === 'alchemy' ? 'alchemy' : 'cooking'} />
            ) : (
                <CraftingRecipeTreePanel {...treeProps} />
            )}
        </aside>
    );
}

'use client';

import Link from 'next/link';
import {
    ChevronDown,
    ChevronRight,
    ChefHat,
    FlaskConical,
    Package2,
    Settings2,
} from 'lucide-react';
import {
    formatRecipeTime,
    getGradeClass,
    type PriceBreakdown,
    type RecipeTreeNode,
} from '@/lib/crafting/calculator';
import { resolveBdoIconUrl } from '@/lib/icon-url';
import { useGlobalSettings } from '@/stores/global-settings-store';
import {
    GlobalSettingsAlchemySection,
    GlobalSettingsCookingSection,
    GlobalSettingsInventorySection,
    GlobalSettingsMarketSection,
} from '@/components/settings/GlobalSettingsSections';

export interface TreeNodeViewProps {
    node: RecipeTreeNode;
    onToggleCollapse: (recipeId: number) => void;
    onToggleRareProc: (recipeId: number) => void;
    onToggleSlowCook: (recipeId: number) => void;
    onSelectMaterial: (recipeId: number, slotIndex: number, itemId: number) => void;
    collapsedIds: number[];
    useRareProcIds: number[];
    slowCookedIds: number[];
}

const PRICE_SOURCE_LABEL: Record<PriceBreakdown['source'], string> = {
    market: 'Mercado',
    custom: 'Manual',
    vendor: 'Vendor/NPC',
    missing: 'Sem preço',
};

function SourcePill({ source }: { source: PriceBreakdown['source'] }) {
    const tone = source === 'market'
        ? 'border-info/30 bg-info/10 text-info'
        : source === 'custom'
            ? 'border-gold/30 bg-gold/10 text-gold'
            : source === 'vendor'
                ? 'border-profit/30 bg-profit/10 text-profit'
                : 'border-loss/30 bg-loss/10 text-loss';

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
            {PRICE_SOURCE_LABEL[source]}
        </span>
    );
}

export function TreeNodeView({
    node,
    onToggleCollapse,
    onToggleRareProc,
    onToggleSlowCook,
    onSelectMaterial,
    collapsedIds,
    useRareProcIds,
    slowCookedIds,
}: TreeNodeViewProps) {
    if (node.type === 'material') {
        const iconUrl = resolveBdoIconUrl(node.iconUrl);

        return (
            <div className="rounded-xl border border-border bg-bg-hover/20 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        {iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={iconUrl} alt={node.name} className="h-9 w-9 rounded-lg border border-border bg-bg-primary" />
                        ) : (
                            <div className="h-9 w-9 rounded-lg border border-border bg-bg-primary" />
                        )}

                        <div className="min-w-0">
                            <p className="truncate font-medium text-primary">{node.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                {node.priceSource ? <SourcePill source={node.priceSource} /> : null}
                                {node.isTradeable === false ? (
                                    <span className="rounded-full border border-border bg-bg-primary px-2 py-0.5 text-[11px] font-medium text-secondary">
                                        Não comercializável
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-2 text-xs text-secondary">
                                {node.requestedQuantity.toFixed(2)} un. • Preço un.: {(node.unitPrice ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </p>
                            {node.priceSource === 'missing' ? (
                                <p className="mt-1 text-xs text-loss">Sem preço conhecido. Ajuste manualmente se necessário.</p>
                            ) : null}
                            {node.priceSource === 'vendor' ? (
                                <p className="mt-1 text-xs text-profit">Tratado como compra de vendor/NPC.</p>
                            ) : null}
                        </div>
                    </div>
                    <span className="font-mono text-sm text-loss">
                        {node.craftingCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>
        );
    }

    const isCollapsed = node.recipeId ? collapsedIds.includes(node.recipeId) : false;
    const usesRareProc = node.recipeId ? !useRareProcIds.includes(node.recipeId) : false;
    const usesSlowCook = node.recipeId ? slowCookedIds.includes(node.recipeId) : false;
    const NodeIcon = node.craftingType === 'alchemy' ? FlaskConical : node.craftingType === 'cooking' ? ChefHat : Package2;

    return (
        <div className="rounded-2xl border border-border bg-bg-hover/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={() => node.recipeId && onToggleCollapse(node.recipeId)}
                        className="mt-0.5 rounded-lg border border-border bg-bg-primary p-1 text-secondary hover:text-primary"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <NodeIcon size={16} className={node.craftingType === 'alchemy' ? 'text-info' : 'text-gold'} />
                            {node.recipeId ? (
                                <Link href={`/${node.craftingType}/${node.recipeId}`} className="font-semibold text-primary hover:text-gold transition-colors">
                                    {node.name}
                                </Link>
                            ) : (
                                <p className="font-semibold text-primary">{node.name}</p>
                            )}
                            <span className={`grade-badge ${getGradeClass(node.outputs[0]?.grade ?? null)}`}>
                                {node.craftingType}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-secondary">
                            Crafts: {node.craftQuantity.toFixed(1)} • Saída esperada: {node.normalProcQuantity.toFixed(1)}
                            {node.rareProcQuantity > 0 ? ` + ${node.rareProcQuantity.toFixed(1)}` : ''}
                        </p>
                    </div>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-2 text-right text-xs">
                    <div>
                        <p className="text-muted uppercase tracking-wider">Lucro/H</p>
                        <p className={`font-mono font-semibold ${node.displayedProfitPerHour >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {node.displayedProfitPerHour.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted uppercase tracking-wider">Tempo</p>
                        <p className="font-mono text-primary">{formatRecipeTime(node.totalTime)}</p>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-secondary">
                {node.recipeId && node.parentRecipeId !== null && node.craftingType !== 'processing' && (
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={usesRareProc}
                            onChange={() => onToggleRareProc(node.recipeId!)}
                            className="size-4 accent-[var(--color-gold)]"
                        />
                        Usar proc raro
                    </label>
                )}

                {node.recipeId && node.parentRecipeId !== null && node.craftingType === 'cooking' && (
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={usesSlowCook}
                            onChange={() => onToggleSlowCook(node.recipeId!)}
                            className="size-4 accent-[var(--color-gold)]"
                        />
                        Cozimento lento
                    </label>
                )}
            </div>

            {!isCollapsed && (
                <div className="mt-4 space-y-3">
                    {Object.entries(node.ingredientAlternatives).map(([slotKey, alternatives], index) => {
                        if (alternatives.length <= 1 || !node.recipeId) {
                            return null;
                        }

                        const child = node.children[index];
                        const selectedAlternative = alternatives.find((alternative) => alternative.itemId === child?.itemId) ?? alternatives[0];
                        return (
                            <label key={`${node.recipeId}-${slotKey}`} className="flex flex-col gap-1 text-xs text-secondary">
                                Escolha do material
                                <select
                                    value={child?.itemId ?? alternatives[0].itemId}
                                    onChange={(event) => onSelectMaterial(node.recipeId!, Number(slotKey), Number(event.target.value))}
                                    className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                                >
                                    {alternatives.map((alternative) => (
                                        <option key={alternative.itemId} value={alternative.itemId}>
                                            {alternative.quantity}x {alternative.item.name} · {alternative.subRecipeId ? `sub-receita ${alternative.subRecipeType}` : 'compra direta'}
                                        </option>
                                    ))}
                                </select>
                                <span>
                                    Alternativas inferidas das variantes cadastradas desta receita. Seleção atual:{' '}
                                    <span className="font-medium text-primary">{selectedAlternative.item.name}</span>
                                    {selectedAlternative.subRecipeId
                                        ? ` com sub-receita ${selectedAlternative.subRecipeType}`
                                        : ' sem sub-receita conhecida'}.
                                </span>
                            </label>
                        );
                    })}

                    <div className="space-y-2 border-l border-border pl-4">
                        {node.children.map((child) => (
                            <TreeNodeView
                                key={child.key}
                                node={child}
                                onToggleCollapse={onToggleCollapse}
                                onToggleRareProc={onToggleRareProc}
                                onToggleSlowCook={onToggleSlowCook}
                                onSelectMaterial={onSelectMaterial}
                                collapsedIds={collapsedIds}
                                useRareProcIds={useRareProcIds}
                                slowCookedIds={slowCookedIds}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function SettingsPanel({ type }: { type: 'cooking' | 'alchemy' }) {
    const settings = useGlobalSettings();

    return (
        <div className="space-y-4 rounded-2xl border border-border bg-bg-hover/10 p-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Settings2 size={16} className="text-gold" />
                    Configurações
                </h3>
                <Link href="/settings" className="text-xs text-gold hover:underline">
                    Abrir página completa
                </Link>
            </div>

            <div className="grid gap-3">
                <GlobalSettingsMarketSection settings={settings} compact />
                {type === 'cooking'
                    ? <GlobalSettingsCookingSection settings={settings} compact />
                    : <GlobalSettingsAlchemySection settings={settings} compact />}
                <GlobalSettingsInventorySection settings={settings} compact />
            </div>
        </div>
    );
}
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
    type RecipeTreeNode,
} from '@/lib/crafting/calculator';
import { useGlobalSettings } from '@/stores/global-settings-store';

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
        return (
            <div className="rounded-xl border border-border bg-bg-hover/20 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate font-medium text-primary">{node.name}</p>
                        <p className="text-xs text-secondary">{node.requestedQuantity.toFixed(2)} un.</p>
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
                        <p className="text-xs text-secondary mt-1">
                            Crafts: {node.craftQuantity.toFixed(1)} • Output: {node.normalProcQuantity.toFixed(1)}
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
                        Usar rare proc
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
                        Slow cook
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
                        return (
                            <label key={`${node.recipeId}-${slotKey}`} className="flex flex-col gap-1 text-xs text-secondary">
                                Material alternativo
                                <select
                                    value={child?.itemId ?? alternatives[0].itemId}
                                    onChange={(event) => onSelectMaterial(node.recipeId!, Number(slotKey), Number(event.target.value))}
                                    className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                                >
                                    {alternatives.map((alternative) => (
                                        <option key={alternative.itemId} value={alternative.itemId}>
                                            {alternative.quantity}x {alternative.item.name}
                                        </option>
                                    ))}
                                </select>
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
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Settings2 size={16} className="text-gold" />
                Configurações
            </h3>

            <div className="grid gap-3">
                <label className="flex items-center justify-between rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-primary">
                    <span>Value Pack</span>
                    <input
                        type="checkbox"
                        checked={settings.hasValuePack}
                        onChange={(event) => settings.setValuePack(event.target.checked)}
                        className="size-4 accent-[var(--color-gold)]"
                    />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-primary">
                    <span>Merchant Ring</span>
                    <input
                        type="checkbox"
                        checked={settings.hasMerchantRing}
                        onChange={(event) => settings.setMerchantRing(event.target.checked)}
                        className="size-4 accent-[var(--color-gold)]"
                    />
                </label>

                <label className="flex flex-col gap-1 text-xs text-secondary">
                    Bônus de fama
                    <input
                        type="number"
                        step="0.001"
                        value={settings.familyFameBonus}
                        onChange={(event) => settings.setFamilyFameBonus(Number(event.target.value))}
                        className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                    />
                </label>

                {type === 'cooking' ? (
                    <>
                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Mastery fast cook
                            <input
                                type="number"
                                value={settings.speedCookingMastery}
                                onChange={(event) => settings.setSpeedCookingMastery(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Tempo fast cook
                            <input
                                type="number"
                                step="0.1"
                                value={settings.speedCookingTime}
                                onChange={(event) => settings.setSpeedCookingTime(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Mastery slow cook
                            <input
                                type="number"
                                value={settings.slowCookingMastery}
                                onChange={(event) => settings.setSlowCookingMastery(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Tempo slow cook
                            <input
                                type="number"
                                step="0.1"
                                value={settings.slowCookingTime}
                                onChange={(event) => settings.setSlowCookingTime(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Byproduct cooking
                            <input
                                type="number"
                                value={settings.cookingByproductUsage}
                                onChange={(event) => settings.setCookingByproductUsage(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>
                    </>
                ) : (
                    <>
                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Mastery alchemy
                            <input
                                type="number"
                                value={settings.alchemyMastery}
                                onChange={(event) => settings.setAlchemyMastery(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Tempo alchemy
                            <input
                                type="number"
                                step="0.1"
                                value={settings.alchemyTimeSeconds}
                                onChange={(event) => settings.setAlchemyTimeSeconds(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Byproduct alchemy
                            <input
                                type="number"
                                value={settings.alchemyByproductUsage}
                                onChange={(event) => settings.setAlchemyByproductUsage(Number(event.target.value))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>
                    </>
                )}

                <label className="flex flex-col gap-1 text-xs text-secondary">
                    Peso total
                    <input
                        type="number"
                        value={settings.weight}
                        onChange={(event) => settings.setWeight(Number(event.target.value))}
                        className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                    />
                </label>

                <label className="flex flex-col gap-1 text-xs text-secondary">
                    Peso usado
                    <input
                        type="number"
                        value={settings.usedWeight}
                        onChange={(event) => settings.setUsedWeight(Number(event.target.value))}
                        className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                    />
                </label>
            </div>
        </div>
    );
}
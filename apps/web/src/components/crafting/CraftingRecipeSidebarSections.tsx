'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
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
    type IngredientAlternative,
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
    depth?: number;
}

interface TreeNodeViewInternalProps extends TreeNodeViewProps {
    materialAlternatives?: IngredientAlternative[];
    materialParentRecipeId?: number | null;
    materialSlotIndex?: number;
    isMaterialSelectorOpen?: boolean;
    onToggleMaterialSelector?: () => void;
    onSelectMaterialOption?: (itemId: number) => void;
}

const PRICE_SOURCE_LABEL: Record<PriceBreakdown['source'], string> = {
    market: 'Mercado',
    custom: 'Manual',
    vendor: 'Vendor/NPC',
    missing: 'Sem preço',
};

function formatCompactValue(value: number, divisor: number, suffix: string) {
    const scaled = value / divisor;
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    const formatted = scaled.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    }).replace(/\.0+$/, '');

    return `${formatted}${suffix}`;
}

function formatCompactSilver(value: number) {
    const absValue = Math.abs(value);
    const prefix = value < 0 ? '-' : '';

    if (absValue >= 1_000_000_000) {
        return `${prefix}${formatCompactValue(absValue, 1_000_000_000, 'B')}`;
    }

    if (absValue >= 1_000_000) {
        return `${prefix}${formatCompactValue(absValue, 1_000_000, 'M')}`;
    }

    if (absValue >= 1_000) {
        return `${prefix}${formatCompactValue(absValue, 1_000, 'K')}`;
    }

    return `${prefix}${Math.round(absValue).toLocaleString('pt-BR')}`;
}

function formatCompactProfitPerHour(value: number) {
    return `${formatCompactSilver(value)}/h`;
}

function formatQuantity(value: number) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
        maximumFractionDigits: 1,
    });
}

function getTreeDepthStyle(depth: number): CSSProperties {
    const mobileDepth = depth <= 2 ? depth : 2 + (depth - 2) * 0.4;

    return {
        '--recipe-tree-depth-desktop': String(depth),
        '--recipe-tree-depth-mobile': mobileDepth.toFixed(2),
    } as CSSProperties;
}

function getRecipeAccentClass(node: Extract<RecipeTreeNode, { type: 'recipe' }>) {
    if (node.craftingType === 'alchemy') {
        return 'recipe-tree-row-alchemy';
    }

    if (node.craftingType === 'processing') {
        return 'recipe-tree-row-processing';
    }

    return 'recipe-tree-row-cooking';
}

function getLevelBadgeClass(node: RecipeTreeNode) {
    if (node.type === 'material') {
        return 'recipe-tree-level recipe-tree-level-material';
    }

    if (node.craftingType === 'alchemy') {
        return 'recipe-tree-level recipe-tree-level-alchemy';
    }

    if (node.craftingType === 'processing') {
        return 'recipe-tree-level recipe-tree-level-processing';
    }

    return 'recipe-tree-level recipe-tree-level-cooking';
}

function getSourceChipClass(source: PriceBreakdown['source']) {
    if (source === 'market') {
        return 'recipe-tree-chip recipe-tree-source-chip recipe-tree-chip-info';
    }

    if (source === 'vendor') {
        return 'recipe-tree-chip recipe-tree-source-chip recipe-tree-chip-profit';
    }

    if (source === 'custom') {
        return 'recipe-tree-chip recipe-tree-source-chip recipe-tree-chip-gold';
    }

    return 'recipe-tree-chip recipe-tree-source-chip recipe-tree-chip-loss';
}

function getNodeIcon(node: RecipeTreeNode) {
    const iconUrl = resolveBdoIconUrl(node.iconUrl ?? node.outputs[0]?.iconUrl ?? null);

    if (iconUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={node.name} className="recipe-tree-icon-image" />
        );
    }

    const FallbackIcon = node.type === 'material'
        ? Package2
        : node.craftingType === 'alchemy'
            ? FlaskConical
            : node.craftingType === 'processing'
                ? Package2
                : ChefHat;

    return <FallbackIcon size={18} className="text-secondary" />;
}

function NodeToggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            aria-pressed={checked}
            className={`recipe-tree-control ${checked ? 'recipe-tree-control-active' : ''}`}
        >
            <span className={`recipe-tree-control-indicator ${checked ? 'recipe-tree-control-indicator-active' : ''}`} />
            {label}
        </button>
    );
}

function AlternativeMaterialSelector({
    alternatives,
    currentItemId,
    open,
    onToggle,
    onSelect,
}: {
    alternatives: IngredientAlternative[];
    currentItemId: number;
    open: boolean;
    onToggle: () => void;
    onSelect: (itemId: number) => void;
}) {
    const selectedAlternative = alternatives.find((alternative) => alternative.itemId === currentItemId) ?? alternatives[0];

    return (
        <>
            <button type="button" onClick={onToggle} className="recipe-tree-inline-action">
                {open ? 'Fechar troca' : 'Trocar material'}
            </button>
            <span className="recipe-tree-inline-note">Atual: {selectedAlternative.item.name}</span>

            {open ? (
                <div className="recipe-tree-selector">
                    <label className="recipe-tree-selector-label">
                        Material do slot
                        <select
                            value={currentItemId}
                            onChange={(event) => onSelect(Number(event.target.value))}
                            className="recipe-tree-selector-input"
                        >
                            {alternatives.map((alternative) => (
                                <option key={alternative.itemId} value={alternative.itemId}>
                                    {alternative.quantity}x {alternative.item.name}
                                    {alternative.subRecipeId
                                        ? ` · sub-receita ${alternative.subRecipeType}`
                                        : ' · compra direta'}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            ) : null}
        </>
    );
}

function TreeNodeViewInternal({
    node,
    onToggleCollapse,
    onToggleRareProc,
    onToggleSlowCook,
    onSelectMaterial,
    collapsedIds,
    useRareProcIds,
    slowCookedIds,
    depth = 0,
    materialAlternatives = [],
    materialParentRecipeId = null,
    materialSlotIndex,
    isMaterialSelectorOpen = false,
    onToggleMaterialSelector,
    onSelectMaterialOption,
}: TreeNodeViewInternalProps) {
    const [openMaterialSlot, setOpenMaterialSlot] = useState<number | null>(null);
    const hasMaterialAlternatives = materialAlternatives.length > 1
        && materialParentRecipeId !== null
        && materialSlotIndex !== undefined
        && Boolean(onToggleMaterialSelector)
        && Boolean(onSelectMaterialOption);

    const renderChildNodes = (childDepth: number): ReactNode => {
        if (node.type !== 'recipe') {
            return null;
        }

        return node.children.map((child, index) => {
            const alternatives = node.ingredientAlternatives[index] ?? [];

            return (
                <TreeNodeViewInternal
                    key={child.key}
                    node={child}
                    onToggleCollapse={onToggleCollapse}
                    onToggleRareProc={onToggleRareProc}
                    onToggleSlowCook={onToggleSlowCook}
                    onSelectMaterial={onSelectMaterial}
                    collapsedIds={collapsedIds}
                    useRareProcIds={useRareProcIds}
                    slowCookedIds={slowCookedIds}
                    depth={childDepth}
                    materialAlternatives={alternatives}
                    materialParentRecipeId={node.recipeId}
                    materialSlotIndex={index}
                    isMaterialSelectorOpen={openMaterialSlot === index}
                    onToggleMaterialSelector={() => {
                        setOpenMaterialSlot((current) => current === index ? null : index);
                    }}
                    onSelectMaterialOption={(itemId) => {
                        if (node.recipeId === null) {
                            return;
                        }

                        onSelectMaterial(node.recipeId, index, itemId);
                        setOpenMaterialSlot(null);
                    }}
                />
            );
        });
    };

    if (node.type === 'material') {
        return (
            <li className="recipe-tree-item" data-depth={depth} style={getTreeDepthStyle(depth)}>
                <article className="recipe-tree-row recipe-tree-row-material">
                    <div className="recipe-tree-row-main">
                        <span className="recipe-tree-toggle-spacer" aria-hidden="true" />
                        <span className={getLevelBadgeClass(node)}>{depth + 1}</span>

                        <div className="recipe-tree-copy">
                            <div className="recipe-tree-headline">
                                <p className="recipe-tree-name">{node.name}</p>
                                <span className="recipe-tree-inline-note">({formatQuantity(node.requestedQuantity)} un.)</span>
                            </div>

                            <div className="recipe-tree-material-meta">
                                <div className="recipe-tree-origin-column">
                                    {node.priceSource ? (
                                        <span className={getSourceChipClass(node.priceSource)}>
                                            {PRICE_SOURCE_LABEL[node.priceSource]}
                                        </span>
                                    ) : null}
                                    {node.isTradeable === false ? (
                                        <span className="recipe-tree-chip recipe-tree-origin-note recipe-tree-chip-neutral">
                                            Não comercializável
                                        </span>
                                    ) : null}
                                </div>

                                <div className="recipe-tree-material-facts">
                                    <span className="recipe-tree-inline-note recipe-tree-price-note">
                                        Preço un.: {(node.unitPrice ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                    </span>
                                    {hasMaterialAlternatives ? (
                                        <AlternativeMaterialSelector
                                            alternatives={materialAlternatives}
                                            currentItemId={node.itemId}
                                            open={isMaterialSelectorOpen}
                                            onToggle={onToggleMaterialSelector!}
                                            onSelect={onSelectMaterialOption!}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="recipe-tree-side">
                            <div className="recipe-tree-value-group">
                                <span className="recipe-tree-value-label">Custo</span>
                                <span className="recipe-tree-value recipe-tree-value-loss">
                                    {formatCompactSilver(node.craftingCost)}
                                </span>
                            </div>
                            <div className="recipe-tree-icon">
                                {getNodeIcon(node)}
                            </div>
                        </div>
                    </div>
                </article>
            </li>
        );
    }

    const isCollapsed = node.recipeId ? collapsedIds.includes(node.recipeId) : false;
    const usesRareProc = node.recipeId ? !useRareProcIds.includes(node.recipeId) : false;
    const usesSlowCook = node.recipeId ? slowCookedIds.includes(node.recipeId) : false;
    const canToggleRareProc = node.recipeId !== null && node.parentRecipeId !== null && node.craftingType !== 'processing';
    const canToggleSlowCook = node.recipeId !== null && node.parentRecipeId !== null && node.craftingType === 'cooking';

    if (depth < 0) {
        return <>{renderChildNodes(0)}</>;
    }

    return (
        <li className="recipe-tree-item" data-depth={depth} style={getTreeDepthStyle(depth)}>
            <article className={`recipe-tree-row recipe-tree-row-recipe ${getRecipeAccentClass(node)} ${depth === 0 && node.parentRecipeId === null ? 'recipe-tree-row-root' : ''}`}>
                <div className="recipe-tree-row-main">
                    <button
                        type="button"
                        onClick={() => node.recipeId && onToggleCollapse(node.recipeId)}
                        className="recipe-tree-collapse"
                        aria-label={isCollapsed ? `Expandir ${node.name}` : `Recolher ${node.name}`}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <span className={getLevelBadgeClass(node)}>{depth + 1}</span>

                    <div className="recipe-tree-copy">
                        <div className="recipe-tree-headline">
                            {node.recipeId ? (
                                <Link href={`/${node.craftingType}/${node.recipeId}`} className="recipe-tree-name-link">
                                    {node.name}
                                </Link>
                            ) : (
                                <p className="recipe-tree-name">{node.name}</p>
                            )}
                            <span className={`recipe-tree-profit ${node.displayedProfitPerHour >= 0 ? 'recipe-tree-profit-positive' : 'recipe-tree-profit-negative'}`}>
                                {formatCompactProfitPerHour(node.displayedProfitPerHour)}
                            </span>
                        </div>

                        <div className="recipe-tree-meta">
                            <span>({formatQuantity(node.craftQuantity)} crafts)</span>
                            <span>
                                Saída {formatQuantity(node.normalProcQuantity)}
                                {node.rareProcQuantity > 0 ? ` + ${formatQuantity(node.rareProcQuantity)}` : ''}
                            </span>
                        </div>

                        <div className="recipe-tree-subline">
                            <span className="recipe-tree-inline-note">Tempo {formatRecipeTime(node.totalTime)}</span>
                            {canToggleRareProc ? (
                                <NodeToggle
                                    label="Usar proc raro"
                                    checked={usesRareProc}
                                    onChange={() => onToggleRareProc(node.recipeId!)}
                                />
                            ) : null}
                            {canToggleSlowCook ? (
                                <NodeToggle
                                    label="Cozimento lento"
                                    checked={usesSlowCook}
                                    onChange={() => onToggleSlowCook(node.recipeId!)}
                                />
                            ) : null}
                            {hasMaterialAlternatives ? (
                                <AlternativeMaterialSelector
                                    alternatives={materialAlternatives}
                                    currentItemId={node.itemId}
                                    open={isMaterialSelectorOpen}
                                    onToggle={onToggleMaterialSelector!}
                                    onSelect={onSelectMaterialOption!}
                                />
                            ) : null}
                        </div>
                    </div>

                    <div className="recipe-tree-icon">
                        {getNodeIcon(node)}
                    </div>
                </div>
            </article>

            {!isCollapsed && node.children.length > 0 ? (
                <ol className="recipe-tree-list recipe-tree-children">
                    {renderChildNodes(depth + 1)}
                </ol>
            ) : null}
        </li>
    );
}

export function TreeNodeView(props: TreeNodeViewProps) {
    return <TreeNodeViewInternal {...props} />;
}

export function SettingsPanel({ type }: { type: 'cooking' | 'alchemy' }) {
    const settings = useGlobalSettings();

    return (
        <section className="overflow-hidden rounded-3xl border border-border bg-bg-hover/10 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-5">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Settings2 size={16} className="text-gold" />
                        Configurações da calculadora
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-secondary">
                        Ajustes globais aplicados ao cálculo de mercado, maestria e inventário.
                    </p>
                </div>

                <Link href="/settings" className="text-xs font-medium text-gold transition-colors hover:text-gold-light">
                    Abrir página completa
                </Link>
            </div>

            <div className="grid gap-4 p-5">
                <GlobalSettingsMarketSection settings={settings} compact />
                {type === 'cooking'
                    ? <GlobalSettingsCookingSection settings={settings} compact />
                    : <GlobalSettingsAlchemySection settings={settings} compact />}
                <GlobalSettingsInventorySection settings={settings} compact />
            </div>
        </section>
    );
}

'use client';

import {
    ArrowLeft,
    ChefHat,
    Clock3,
    FlaskConical,
    Sparkles,
} from 'lucide-react';
import { resolveBdoIconUrl } from '@/lib/icon-url';
import { getGradeClass, type CraftingType } from '@/lib/crafting/calculator';

export interface CraftingRecipeHeaderProps {
    recipeName: string;
    recipeType: CraftingType;
    resultQuantity: number;
    resultItemGrade?: number | null;
    resultItemIconUrl?: string | null;
    resultPrice: number;
    resultPriceSource: 'custom' | 'market' | 'vendor' | 'missing';
    craftQuantity: number;
    slowCookEnabled: boolean;
    showSettings: boolean;
    onBack: () => void;
    onCraftQuantityChange: (value: number) => void;
    onToggleSlowCook: () => void;
    onToggleShowSettings: () => void;
}

export function CraftingRecipeHeader({
    recipeName,
    recipeType,
    resultQuantity,
    resultItemGrade,
    resultItemIconUrl,
    resultPrice,
    resultPriceSource,
    craftQuantity,
    slowCookEnabled,
    showSettings,
    onBack,
    onCraftQuantityChange,
    onToggleSlowCook,
    onToggleShowSettings,
}: CraftingRecipeHeaderProps) {
    const resultIconUrl = resolveBdoIconUrl(resultItemIconUrl);
    const Icon = recipeType === 'alchemy' ? FlaskConical : ChefHat;
    const priceSourceLabel = {
        market: 'Mercado',
        custom: 'Manual',
        vendor: 'Vendor/NPC',
        missing: 'Sem preço',
    }[resultPriceSource];

    return (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full border border-border bg-bg-hover p-2 text-secondary hover:text-primary"
                >
                    <ArrowLeft size={18} />
                </button>

                <div className="flex items-center gap-4">
                    {resultIconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={resultIconUrl}
                            alt={recipeName}
                            className="h-14 w-14 rounded-2xl border border-border bg-bg-primary"
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-primary">
                            <Icon size={22} className={recipeType === 'alchemy' ? 'text-info' : 'text-gold'} />
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-primary">{recipeName}</h1>
                            <span className={`grade-badge ${getGradeClass(resultItemGrade ?? null)}`}>
                                {recipeType}
                            </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-secondary">
                            <span>Resultado base: {resultQuantity} por craft</span>
                            <span>•</span>
                            <span>Preço de referência: {resultPrice.toLocaleString('pt-BR')}</span>
                            <span className="rounded-full border border-border bg-bg-hover/40 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {priceSourceLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-2xl border border-border bg-bg-hover px-4 py-3 text-sm text-primary">
                    <Sparkles size={16} className="text-gold" />
                    Quantidade
                    <input
                        type="number"
                        value={craftQuantity}
                        onChange={(event) => onCraftQuantityChange(Number(event.target.value))}
                        className="w-24 bg-transparent text-right font-mono focus:outline-none"
                    />
                </label>

                {recipeType === 'cooking' && (
                    <label className="flex items-center gap-2 rounded-2xl border border-border bg-bg-hover px-4 py-3 text-sm text-primary">
                        <Clock3 size={16} className="text-gold" />
                        Cozimento lento
                        <input
                            type="checkbox"
                            checked={slowCookEnabled}
                            onChange={onToggleSlowCook}
                            className="size-4 accent-[var(--color-gold)]"
                        />
                    </label>
                )}

                <button
                    type="button"
                    onClick={onToggleShowSettings}
                    className="rounded-2xl border border-border bg-bg-hover px-4 py-3 text-sm text-primary transition-colors hover:border-gold"
                >
                    {showSettings ? 'Árvore' : 'Configurações'}
                </button>
            </div>
        </div>
    );
}
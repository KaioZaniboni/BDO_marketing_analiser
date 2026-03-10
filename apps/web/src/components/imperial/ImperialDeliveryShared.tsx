'use client';

import type { ImperialBestAcquisition, ImperialBestSaleChannel, ImperialIngredientPerBox, ImperialRankingRow, ImperialTierKey } from '@bdo/api';
import { formatRecipeTime } from '@/lib/crafting/calculator';

const TIER_TONE: Record<ImperialTierKey, string> = {
    APPRENTICE: 'border-border bg-bg-hover/50 text-secondary',
    SKILLED: 'border-info/30 bg-info/10 text-info',
    PROFESSIONAL: 'border-warning/30 bg-warning/10 text-warning',
    ARTISAN: 'border-gold/30 bg-gold/10 text-gold',
    MASTER: 'border-profit/30 bg-profit/10 text-profit',
    GURU: 'border-gold/40 bg-gold/15 text-gold',
};

export function formatSilver(value: number | null | undefined): string {
    if (value == null) {
        return 'Sem mercado';
    }

    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function formatCompactSilver(value: number): string {
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)}B`;
    }

    if (absolute >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M`;
    }

    if (absolute >= 1_000) {
        return `${(value / 1_000).toFixed(1)}k`;
    }

    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function ImperialTierBadge({
    tierKey,
    label,
}: {
    tierKey: ImperialTierKey;
    label: string;
}) {
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${TIER_TONE[tierKey]}`}>
            {label}
        </span>
    );
}

export function ImperialOptionBadge({
    channel,
}: {
    channel: ImperialBestSaleChannel;
}) {
    const tone = channel === 'imperial'
        ? 'border-gold/30 bg-gold/10 text-gold'
        : 'border-info/30 bg-info/10 text-info';

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}>
            {channel === 'imperial' ? 'Imperial' : 'Mercado'}
        </span>
    );
}

export function ImperialAcquisitionLabel({
    mode,
}: {
    mode: ImperialBestAcquisition;
}) {
    return mode === 'buy' ? 'Comprar no mercado' : 'Produzir a caixa';
}

export function ImperialBreakdown({
    row,
}: {
    row: ImperialRankingRow;
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-2xl border border-border bg-bg-hover/15 p-4">
                <h4 className="text-sm font-semibold text-primary">Comparativo da caixa</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MetricCard label="NPC base" value={formatSilver(row.baseBoxNpcPrice)} tone="text-secondary" />
                    <MetricCard label="Venda imperial" value={formatSilver(row.imperialSalePrice)} tone="text-gold" />
                    <MetricCard label="Custo por craft" value={formatSilver(row.costPerCraft)} tone="text-loss" />
                    <MetricCard label="Custo por caixa" value={formatSilver(row.costPerBoxProduced)} tone="text-loss" />
                    <MetricCard label="Mercado liquido" value={formatSilver(row.marketSaleRevenuePerBox)} tone="text-info" />
                    <MetricCard label="Tempo por caixa" value={formatRecipeTime(row.craftSecondsPerBox)} tone="text-secondary" />
                </div>
                <div className="mt-4 rounded-xl border border-border bg-bg-primary/45 p-3 text-xs text-secondary">
                    <p>Bônus de maestria aplicado: <span className="font-mono text-gold">+{(row.masteryBonusPct * 100).toFixed(2)}%</span></p>
                    <p className="mt-1">Melhor forma de montar a caixa: <span className="text-primary">{ImperialAcquisitionLabel({ mode: row.bestImperialAcquisition })}</span></p>
                    <p className="mt-1">Saída média por craft: <span className="font-mono text-primary">{row.expectedOutputPerCraft.toFixed(3)}</span> ({row.targetOutputKind === 'proc' ? 'proc raro' : 'resultado principal'})</p>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg-hover/15 p-4">
                <h4 className="text-sm font-semibold text-primary">Ingredientes por caixa</h4>
                <div className="mt-3 flex flex-col gap-2">
                    {row.ingredientsPerBox.map((ingredient) => (
                        <IngredientRow key={ingredient.itemId} ingredient={ingredient} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-bg-primary/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-secondary">{label}</p>
            <p className={`mt-2 font-mono text-sm font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

function IngredientRow({
    ingredient,
}: {
    ingredient: ImperialIngredientPerBox;
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-primary/35 p-3">
            {ingredient.iconUrl ? (
                <img src={ingredient.iconUrl} alt={ingredient.name} className="h-10 w-10 rounded-lg border border-border bg-bg-primary" />
            ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-primary text-[11px] text-muted">
                    {ingredient.itemId}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">{ingredient.name}</p>
                <p className="text-xs text-secondary">
                    {ingredient.quantity.toFixed(2)} un. · {ingredient.source === 'vendor' ? 'Vendor/NPC' : ingredient.source === 'market' ? 'Mercado' : 'Sem preco'}
                </p>
            </div>
            <div className="text-right">
                <p className="font-mono text-sm font-semibold text-loss">{formatSilver(ingredient.totalCost)}</p>
                <p className="text-[11px] text-secondary">un. {formatSilver(ingredient.unitPrice)}</p>
            </div>
        </div>
    );
}

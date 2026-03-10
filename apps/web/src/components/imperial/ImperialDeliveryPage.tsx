'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';
import type { ImperialRankingRow, ImperialType } from '@bdo/api';
import { Crown, FlaskConical, Info, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useCraftingCalculatorStore } from '@/stores/crafting-calculator-store';
import { useGlobalSettings } from '@/stores/global-settings-store';
import { ImperialBreakdown, ImperialOptionBadge, ImperialTierBadge, formatCompactSilver, formatPercent, formatSilver } from './ImperialDeliveryShared';
import { type ImperialSortField, useImperialPreferencesStore } from '@/stores/imperial-preferences-store';

const TITLES: Record<ImperialType, { title: string; description: string; accent: string }> = {
    cooking: {
        title: 'Culinária Imperial',
        description: 'Compare produzir a caixa, comprar no mercado e vender o item diretamente com os multiplicadores atuais.',
        accent: 'text-gold',
    },
    alchemy: {
        title: 'Alquimia Imperial',
        description: 'Ranking completo das caixas imperiais com foco em lucro por caixa, ROI e alternativa de mercado.',
        accent: 'text-info',
    },
};

export function ImperialDeliveryPage({ type }: { type: ImperialType }) {
    const { status } = useSession();
    const hasSession = status === 'authenticated';
    const settings = useGlobalSettings();
    const pages = useImperialPreferencesStore((state) => state.pages);
    const setPreferences = useImperialPreferencesStore((state) => state.setPreferences);
    const resetPreferences = useImperialPreferencesStore((state) => state.resetPreferences);
    const preferences = pages[type];
    const favoriteIds = useCraftingCalculatorStore((state) => state.favoriteIds);
    const toggleFavorite = useCraftingCalculatorStore((state) => state.toggleFavorite);

    const mastery = type === 'cooking' ? settings.cookingMastery : settings.alchemyMastery;
    const actionSeconds = type === 'cooking' ? settings.speedCookingTime : settings.alchemyTimeSeconds;
    const queryInput = {
        type,
        mastery,
        cookingTimeSeconds: type === 'cooking' ? actionSeconds : undefined,
        alchemyTimeSeconds: type === 'alchemy' ? actionSeconds : undefined,
        taxConfig: {
            baseTaxRate: 0.35,
            hasValuePack: settings.hasValuePack,
            hasMerchantRing: settings.hasMerchantRing,
            familyFame: settings.familyFame,
        },
    };

    const rankingQuery = trpc.recipe.getImperialRanking.useQuery(queryInput);
    const inventoryCoverageQuery = trpc.recipe.getImperialInventoryCoverage.useQuery(queryInput, {
        enabled: hasSession,
        retry: false,
    });

    const favoriteSet = useMemo(() => new Set(favoriteIds[type]), [favoriteIds, type]);
    const inventoryCoverage = useMemo(
        () => new Map((inventoryCoverageQuery.data ?? []).map((row) => [row.coverageKey, row])),
        [inventoryCoverageQuery.data],
    );
    const rows = useMemo(() => {
        const baseRows = rankingQuery.data ?? [];
        const direction = preferences.sortDirection === 'asc' ? 1 : -1;
        const filtered = baseRows.filter((row) => {
            if (preferences.tier !== 'ALL' && row.tierKey !== preferences.tier) {
                return false;
            }

            if (row.profitImperialProducing < preferences.minimumProfit) {
                return false;
            }

            if (preferences.itemKind !== 'all' && row.targetOutputKind !== preferences.itemKind) {
                return false;
            }

            if (preferences.showOnlyFavorites && !favoriteSet.has(row.recipeId)) {
                return false;
            }

            if (preferences.showOnlyBestImperial && row.bestSaleChannel !== 'imperial') {
                return false;
            }

            return true;
        });

        return [...filtered].sort((left, right) => direction * getSortValue(left, preferences.sortBy, right));
    }, [favoriteSet, preferences, rankingQuery.data]);

    const summary = useMemo(() => {
        const bestImperial = rows[0] ?? null;
        const bestMarket = [...rows]
            .filter((row) => row.profitMarketProducing != null)
            .sort((left, right) => (right.profitMarketProducing ?? Number.NEGATIVE_INFINITY) - (left.profitMarketProducing ?? Number.NEGATIVE_INFINITY))[0] ?? null;
        const bestRoi = [...rows].sort((left, right) => right.imperialRoi - left.imperialRoi)[0] ?? null;
        const tierCounts = rows.reduce<Record<string, number>>((acc, row) => {
            acc[row.tierKey] = (acc[row.tierKey] ?? 0) + 1;
            return acc;
        }, {});

        return { bestImperial, bestMarket, bestRoi, tierCounts };
    }, [rows]);
    const masteryBonus = (rankingQuery.data?.[0]?.masteryBonusPct ?? 0) * 100;

    const config = TITLES[type];
    const callbackUrl = type === 'cooking' ? '/cooking/imperial' : '/alchemy/imperial';

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className={`flex items-center gap-3 text-2xl font-bold ${config.accent}`}>
                        {type === 'cooking' ? <Crown size={24} /> : <FlaskConical size={24} />}
                        {config.title}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm text-secondary">{config.description}</p>
                </div>
                <div className="card flex flex-wrap items-center gap-4 p-4 text-sm">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-secondary">Maestria</p>
                        <p className={`font-mono text-lg font-semibold ${config.accent}`}>{mastery}</p>
                    </div>
                    <div>
                        <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-secondary">
                            Bonus imperial
                            <span title="Preco final = piso((preco base da caixa x 2,5) x (1 + bonus de maestria)). O bonus segue a tabela oficial de maestria imperial.">
                                <Info size={12} />
                            </span>
                        </p>
                        <p className="font-mono text-lg font-semibold text-profit">+{masteryBonus.toFixed(2)}%</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-secondary">Tempo por acao</p>
                        <p className="font-mono text-lg font-semibold text-primary">{actionSeconds.toFixed(1)}s</p>
                    </div>
                </div>
            </header>

            <section className="grid gap-4 lg:grid-cols-4">
                <SummaryCard label="Melhor imperial" value={summary.bestImperial ? formatCompactSilver(summary.bestImperial.profitImperialProducing) : '—'} helper={summary.bestImperial?.targetItemName ?? 'Sem dados'} tone="text-gold" />
                <SummaryCard label="Melhor mercado" value={summary.bestMarket ? formatCompactSilver(summary.bestMarket.profitMarketProducing ?? 0) : '—'} helper={summary.bestMarket?.targetItemName ?? 'Sem mercado'} tone="text-info" />
                <SummaryCard label="Melhor ROI" value={summary.bestRoi ? formatPercent(summary.bestRoi.imperialRoi) : '—'} helper={summary.bestRoi?.targetItemName ?? 'Sem dados'} tone="text-profit" />
                <div className="card p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-secondary">Receitas por tier</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(summary.tierCounts).length > 0 ? Object.entries(summary.tierCounts).map(([tierKey, count]) => (
                            <ImperialTierBadge key={tierKey} tierKey={tierKey as ImperialRankingRow['tierKey']} label={`${tierKey.slice(0, 3)} · ${count}`} />
                        )) : <span className="text-sm text-secondary">Sem dados filtrados.</span>}
                    </div>
                </div>
            </section>

            <section className="card p-4">
                <div className="grid gap-4 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
                    <FilterField label="Tier">
                        <select value={preferences.tier} onChange={(event) => setPreferences(type, { tier: event.target.value as typeof preferences.tier })} className="imperial-input">
                            <option value="ALL">Todos</option>
                            <option value="APPRENTICE">Aprendiz</option>
                            <option value="SKILLED">Habilidoso</option>
                            <option value="PROFESSIONAL">Profissional</option>
                            <option value="ARTISAN">Artesão</option>
                            <option value="MASTER">Mestre</option>
                            <option value="GURU">Guru</option>
                        </select>
                    </FilterField>
                    <FilterField label="Lucro mínimo">
                        <input type="number" value={preferences.minimumProfit} onChange={(event) => setPreferences(type, { minimumProfit: Number(event.target.value) || 0 })} className="imperial-input" />
                    </FilterField>
                    <FilterField label="Tipo do item">
                        <select value={preferences.itemKind} onChange={(event) => setPreferences(type, { itemKind: event.target.value as typeof preferences.itemKind })} className="imperial-input">
                            <option value="all">Todos</option>
                            <option value="result">Resultado principal</option>
                            <option value="proc">Proc especial</option>
                        </select>
                    </FilterField>
                    <FilterField label="Ordenar por">
                        <select value={preferences.sortBy} onChange={(event) => setPreferences(type, { sortBy: event.target.value as typeof preferences.sortBy })} className="imperial-input">
                            <option value="profit">Lucro imperial</option>
                            <option value="roi">ROI</option>
                            <option value="volume">Volume</option>
                            <option value="tier">Tier</option>
                        </select>
                    </FilterField>
                    <FilterField label="Direção">
                        <select value={preferences.sortDirection} onChange={(event) => setPreferences(type, { sortDirection: event.target.value as typeof preferences.sortDirection })} className="imperial-input">
                            <option value="desc">Maior primeiro</option>
                            <option value="asc">Menor primeiro</option>
                        </select>
                    </FilterField>
                    <div className="flex flex-col gap-2">
                        <ToggleRow label="Somente favoritos" checked={preferences.showOnlyFavorites} onChange={(checked) => setPreferences(type, { showOnlyFavorites: checked })} />
                        <ToggleRow label="So quando imperial vence" checked={preferences.showOnlyBestImperial} onChange={(checked) => setPreferences(type, { showOnlyBestImperial: checked })} />
                    </div>
                    <button type="button" onClick={() => resetPreferences(type)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-gold/40 hover:text-primary">
                        Limpar
                    </button>
                </div>
            </section>

            <section className="card overflow-hidden">
                <div className="hidden grid-cols-[minmax(0,2.5fr)_repeat(7,minmax(0,1fr))_0.9fr_0.8fr] gap-3 border-b border-border bg-bg-hover/25 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-secondary xl:grid">
                    <span>Caixa e receita</span><span>Imperial comprando</span><span>Imperial produzindo</span><span>Mercado produzindo</span><span>ROI</span><span>Mercado un.</span><span>Volume</span><span>Estoque</span><span>Melhor</span><span>Fav.</span>
                </div>
                {rankingQuery.isLoading ? (
                    <div className="flex flex-col gap-3 p-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-20 w-full rounded-2xl" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="p-6 text-sm text-secondary">Nenhuma caixa imperial encontrada com os filtros atuais.</div>
                ) : (
                    <div className="flex flex-col">
                        {rows.map((row) => {
                            const isFavorite = favoriteSet.has(row.recipeId);
                            const coverage = inventoryCoverage.get(row.coverageKey);

                            return (
                                <details key={row.coverageKey} className="border-t border-border/70 first:border-t-0">
                                    <summary className="grid cursor-pointer grid-cols-1 gap-3 px-4 py-4 marker:hidden xl:grid-cols-[minmax(0,2.5fr)_repeat(7,minmax(0,1fr))_0.9fr_0.8fr] xl:items-center">
                                        <div className="min-w-0">
                                            <div className="flex items-start gap-3">
                                                {row.targetIconUrl ? <img src={row.targetIconUrl} alt={row.targetItemName} className="h-12 w-12 rounded-xl border border-border bg-bg-primary" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg-primary text-xs text-muted">{row.targetItemId}</div>}
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="truncate font-semibold text-primary">{row.targetItemName}</p>
                                                        <ImperialTierBadge tierKey={row.tierKey} label={row.tierName} />
                                                    </div>
                                                    <p className="mt-1 text-sm text-secondary">{row.boxName} · x{row.qtyRequired} por caixa</p>
                                                    <p className="mt-1 text-xs text-secondary">{row.recipeName} · {row.targetOutputKind === 'proc' ? 'proc especial' : 'resultado principal'}</p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-secondary">
                                                        <span>Tempo: {row.craftSecondsPerBox.toFixed(1)}s</span>
                                                        <span>Saída/craft: {row.expectedOutputPerCraft.toFixed(3)}</span>
                                                        {hasSession ? <span>{coverage ? `${coverage.maxBoxesFromInventory} caixas do inventário` : 'Calculando inventário...'}</span> : <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-gold hover:underline">Entrar para ver cobertura</Link>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <ValueCell value={row.profitImperialBuying} tone="text-secondary" />
                                        <ValueCell value={row.profitImperialProducing} tone={row.profitImperialProducing >= 0 ? 'text-profit' : 'text-loss'} />
                                        <ValueCell value={row.profitMarketProducing} tone="text-info" />
                                        <span className="font-mono text-sm font-semibold text-primary">{formatPercent(row.imperialRoi)}</span>
                                        <span className="font-mono text-sm text-secondary">{formatSilver(row.marketUnitPrice || null)}</span>
                                        <span className="font-mono text-sm text-secondary">{row.dailyVolume.toLocaleString('pt-BR')}</span>
                                        <span className="font-mono text-sm text-secondary">{row.currentStock.toLocaleString('pt-BR')}</span>
                                        <ImperialOptionBadge channel={row.bestSaleChannel} />
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                toggleFavorite(type, row.recipeId);
                                            }}
                                            className={`flex h-9 w-9 items-center justify-center rounded-full border ${isFavorite ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border text-secondary'} transition-colors hover:border-gold/40 hover:text-gold`}
                                        >
                                            <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                                        </button>
                                    </summary>
                                    <div className="border-t border-border/70 bg-bg-primary/30 px-4 py-4">
                                        <ImperialBreakdown row={row} />
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

function getSortValue(left: ImperialRankingRow, sortBy: ImperialSortField, right: ImperialRankingRow): number {
    switch (sortBy) {
        case 'roi':
            return left.imperialRoi - right.imperialRoi;
        case 'volume':
            return left.dailyVolume - right.dailyVolume;
        case 'tier':
            return left.tierSortOrder - right.tierSortOrder;
        case 'profit':
        default:
            return left.profitImperialProducing - right.profitImperialProducing;
    }
}

function FilterField({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="text-[11px] uppercase tracking-[0.16em] text-secondary">{label}</span>
            {children}
        </label>
    );
}

function ToggleRow({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-sm text-secondary">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            {label}
        </label>
    );
}

function SummaryCard({
    label,
    value,
    helper,
    tone,
}: {
    label: string;
    value: string;
    helper: string;
    tone: string;
}) {
    return (
        <div className="card p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-secondary">{label}</p>
            <p className={`mt-2 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
            <p className="mt-2 text-sm text-secondary">{helper}</p>
        </div>
    );
}

function ValueCell({
    value,
    tone,
}: {
    value: number | null;
    tone: string;
}) {
    return (
        <span className={`font-mono text-sm font-semibold ${tone}`}>
            {value == null ? 'Sem mercado' : `${value >= 0 ? '+' : ''}${formatSilver(value)}`}
        </span>
    );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowDownRight,
    ArrowUpDown,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    ChefHat,
    Filter,
    FlaskConical,
    Heart,
    Search,
    Settings2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { resolveBdoIconUrl } from '@/lib/icon-url';
import {
    buildOverviewRows,
    mapGlobalSettingsToCraftingSettings,
    type CalculatorItem,
    type CraftingCalculatorState,
    type CalculatorRecipe,
    type RecipeOverviewRow,
} from '@/lib/crafting/calculator';
import { matchesOverviewFilters, type OverviewFiltersState } from '@/lib/crafting/overview-filters';
import { useCraftingCalculatorStore } from '@/stores/crafting-calculator-store';
import { useGlobalSettings } from '@/stores/global-settings-store';

type PageType = 'cooking' | 'alchemy';
type SortDirection = 'asc' | 'desc';

interface SortRule {
    column: 'favorite' | 'name' | 'silverPerHour' | 'marketPrice' | 'priceChange' | 'dailyVolume' | 'volumeChange' | 'experience';
    direction: SortDirection;
}

type OverviewFilters = OverviewFiltersState;

interface CraftingMarketPageProps {
    type: PageType;
}

const PAGE_SIZE = 30;

function getStorageKey(type: PageType): string {
    return `bdo-${type}-overview-v2`;
}

function readOverviewState(type: PageType): { searchTerm: string; sorts: SortRule[]; filters: OverviewFilters } {
    if (typeof window === 'undefined') {
        return {
            searchTerm: '',
            sorts: [
                { column: 'favorite', direction: 'desc' },
                { column: 'silverPerHour', direction: 'desc' },
            ],
            filters: {
                minSilverPerHour: '',
                minDailyVolume: '',
                favoritesOnly: false,
            },
        };
    }

    const rawValue = window.localStorage.getItem(getStorageKey(type));
    if (!rawValue) {
        return {
            searchTerm: '',
            sorts: [
                { column: 'favorite', direction: 'desc' },
                { column: 'silverPerHour', direction: 'desc' },
            ],
            filters: {
                minSilverPerHour: '',
                minDailyVolume: '',
                favoritesOnly: false,
            },
        };
    }

    try {
        return JSON.parse(rawValue) as { searchTerm: string; sorts: SortRule[]; filters: OverviewFilters };
    } catch {
        return {
            searchTerm: '',
            sorts: [
                { column: 'favorite', direction: 'desc' },
                { column: 'silverPerHour', direction: 'desc' },
            ],
            filters: {
                minSilverPerHour: '',
                minDailyVolume: '',
                favoritesOnly: false,
            },
        };
    }
}

function getPrimaryAccent(type: PageType): string {
    return type === 'cooking' ? 'text-gold' : 'text-info';
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits });
}

function formatSignedPercent(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
        return 'N/D';
    }

    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
}

function compareRows(left: RecipeOverviewRow, right: RecipeOverviewRow, rule: SortRule): number {
    const getValue = (row: RecipeOverviewRow): number | string => {
        switch (rule.column) {
            case 'favorite':
                return row.favorite ? 1 : 0;
            case 'name':
                return row.name.toLowerCase();
            case 'silverPerHour':
                return row.silverPerHour;
            case 'marketPrice':
                return row.marketPrice;
            case 'priceChange':
                return row.priceChange ?? Number.NEGATIVE_INFINITY;
            case 'dailyVolume':
                return row.dailyVolume;
            case 'volumeChange':
                return row.volumeChange ?? Number.NEGATIVE_INFINITY;
            case 'experience':
                return row.experience;
        }
    };

    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        const result = leftValue.localeCompare(rightValue);
        return rule.direction === 'asc' ? result : -result;
    }

    const numericResult = Number(leftValue) - Number(rightValue);
    return rule.direction === 'asc' ? numericResult : -numericResult;
}

export function CraftingMarketPage({ type }: CraftingMarketPageProps) {
    const router = useRouter();
    const settings = useGlobalSettings();
    const customPrices = useCraftingCalculatorStore((state) => state.customPrices);
    const taxedItemIds = useCraftingCalculatorStore((state) => state.taxedItemIds);
    const keptItemIds = useCraftingCalculatorStore((state) => state.keptItemIds);
    const favoriteIds = useCraftingCalculatorStore((state) => state.favoriteIds);
    const craftQuantities = useCraftingCalculatorStore((state) => state.craftQuantities);
    const selectedMaterials = useCraftingCalculatorStore((state) => state.selectedMaterials);
    const useRareProcIds = useCraftingCalculatorStore((state) => state.useRareProcIds);
    const slowCookedIds = useCraftingCalculatorStore((state) => state.slowCookedIds);
    const collapsedIds = useCraftingCalculatorStore((state) => state.collapsedIds);
    const toggleFavorite = useCraftingCalculatorStore((state) => state.toggleFavorite);
    const overviewState = useMemo(() => readOverviewState(type), [type]);
    const [searchTerm, setSearchTerm] = useState(overviewState.searchTerm);
    const [sorts, setSorts] = useState<SortRule[]>(overviewState.sorts);
    const [filters, setFilters] = useState<OverviewFilters>(overviewState.filters);
    const [page, setPage] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const catalogTypes = useMemo<Array<'cooking' | 'alchemy' | 'processing'>>(
        () => (type === 'alchemy' ? ['alchemy', 'cooking'] : ['cooking']),
        [type],
    );
    const { data: catalogData, isLoading } = trpc.recipe.catalog.useQuery({
        types: catalogTypes,
        historyDays: 28,
    });
    const recipes = useMemo(
        () => ((catalogData?.recipes ?? []) as CalculatorRecipe[]),
        [catalogData],
    );
    const supportItems = useMemo(
        () => ((catalogData?.supportItems ?? []) as CalculatorItem[]),
        [catalogData],
    );

    useEffect(() => {
        window.localStorage.setItem(getStorageKey(type), JSON.stringify({ searchTerm, sorts, filters }));
    }, [filters, searchTerm, sorts, type]);

    const craftingSettings = useMemo(
        () => mapGlobalSettingsToCraftingSettings(settings),
        [settings],
    );

    const calculatorState = useMemo<CraftingCalculatorState>(() => ({
        customPrices,
        taxedItemIds,
        keptItemIds,
        favoriteIds,
        craftQuantities,
        selectedMaterials,
        useRareProcIds,
        slowCookedIds,
        collapsedIds,
    }), [
        collapsedIds,
        craftQuantities,
        customPrices,
        favoriteIds,
        keptItemIds,
        selectedMaterials,
        slowCookedIds,
        taxedItemIds,
        useRareProcIds,
    ]);

    const rows = useMemo(
        () => buildOverviewRows(recipes, type, craftingSettings, calculatorState, supportItems),
        [calculatorState, craftingSettings, recipes, supportItems, type],
    );

    const filteredRows = useMemo(() => {
        let nextRows = rows.filter((row) => matchesOverviewFilters(row, searchTerm, filters));

        nextRows = [...nextRows].sort((left, right) => {
            for (const rule of sorts) {
                const result = compareRows(left, right, rule);
                if (result !== 0) {
                    return result;
                }
            }

            return left.name.localeCompare(right.name);
        });

        return nextRows;
    }, [filters, rows, searchTerm, sorts]);

    const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
    const currentPage = Math.min(page, Math.max(totalPages - 1, 0));
    const paginatedRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const activeFilterCount = Number(Boolean(filters.minSilverPerHour)) +
        Number(Boolean(filters.minDailyVolume)) +
        Number(filters.favoritesOnly);

    const cycleSort = (column: SortRule['column'], additive: boolean) => {
        setSorts((current) => {
            const existing = current.find((rule) => rule.column === column);

            if (!additive) {
                if (!existing) {
                    return [{ column, direction: 'desc' }];
                }
                if (existing.direction === 'desc') {
                    return [{ column, direction: 'asc' }];
                }
                return [{ column: 'favorite', direction: 'desc' }, { column: 'silverPerHour', direction: 'desc' }];
            }

            const rest = current.filter((rule) => rule.column !== column);
            if (!existing) {
                return [...rest, { column, direction: 'desc' }];
            }
            if (existing.direction === 'desc') {
                return [...rest, { column, direction: 'asc' }];
            }
            return rest.length > 0 ? rest : [{ column: 'silverPerHour', direction: 'desc' }];
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                        {type === 'cooking'
                            ? <ChefHat size={24} className={getPrimaryAccent(type)} />
                            : <FlaskConical size={24} className={getPrimaryAccent(type)} />}
                        {type === 'cooking' ? 'Calculadora de Culinária' : 'Calculadora de Alquimia'}
                    </h1>
                    <p className="text-sm text-secondary max-w-3xl">
                        Overview de mercado no estilo BDOLytics com busca por receita e ingredientes, favoritos, filtros mínimos e ranking por prata/hora.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="card px-4 py-3 flex items-center gap-2 text-xs text-secondary">
                        <Settings2 size={14} className="text-gold" />
                        <span>VP: {settings.hasValuePack ? 'on' : 'off'}</span>
                        <span>Net: {(0.65 + 0.65 * ((settings.hasValuePack ? 0.3 : 0) + (settings.hasMerchantRing ? 0.05 : 0) + settings.familyFameBonus)).toFixed(3)}</span>
                        <span>Tempo: {(type === 'cooking' ? settings.speedCookingTime : settings.alchemyTimeSeconds).toFixed(1)}s</span>
                    </div>
                </div>
            </div>

            <div className="card p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setPage(0);
                            }}
                            placeholder="Pesquisar receita ou ingrediente..."
                            className="w-full rounded-xl border border-border bg-bg-hover pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-gold transition-colors"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowFilters((current) => !current)}
                        className="rounded-xl border border-border bg-bg-hover px-4 py-2.5 text-sm text-primary hover:border-gold transition-colors flex items-center gap-2"
                    >
                        <Filter size={16} className="text-gold" />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <p className="text-xs text-muted ml-auto">
                        {filteredRows.length} receitas
                    </p>
                </div>

                {showFilters && (
                    <div className="grid gap-3 rounded-xl border border-border bg-bg-hover/40 p-4 md:grid-cols-3">
                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Prata/h mínima
                            <input
                                type="number"
                                value={filters.minSilverPerHour}
                                onChange={(event) => setFilters((current) => ({ ...current, minSilverPerHour: event.target.value }))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-1 text-xs text-secondary">
                            Volume mínimo
                            <input
                                type="number"
                                value={filters.minDailyVolume}
                                onChange={(event) => setFilters((current) => ({ ...current, minDailyVolume: event.target.value }))}
                                className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex items-center gap-3 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-primary">
                            <input
                                type="checkbox"
                                checked={filters.favoritesOnly}
                                onChange={(event) => setFilters((current) => ({ ...current, favoritesOnly: event.target.checked }))}
                                className="size-4 accent-[var(--color-gold)]"
                            />
                            Somente favoritos
                        </label>
                    </div>
                )}
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-bg-hover text-secondary text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left">Receita</th>
                                <th className="px-4 py-3 text-center">Fav</th>
                                {[
                                    ['silverPerHour', 'Prata/H'],
                                    ['marketPrice', 'Preço'],
                                    ['priceChange', 'Trend Preço'],
                                    ['dailyVolume', 'Volume'],
                                    ['volumeChange', 'Trend Vol.'],
                                    ['experience', 'XP'],
                                ].map(([column, label]) => (
                                    <th
                                        key={column}
                                        className="px-4 py-3 text-right cursor-pointer select-none"
                                        onClick={(event) => cycleSort(column as SortRule['column'], event.shiftKey)}
                                    >
                                        <span className="inline-flex items-center justify-end gap-1">
                                            {label}
                                            <ArrowUpDown size={12} className="text-muted" />
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, index) => (
                                    <tr key={index} className="border-t border-border">
                                        <td colSpan={8} className="px-4 py-4">
                                            <div className="skeleton h-8 w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-secondary">
                                        Nenhuma receita encontrada com os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((row) => {
                                    const resultIconUrl = resolveBdoIconUrl(row.recipe.resultItem.iconUrl);

                                    return (
                                        <tr
                                            key={row.id}
                                            className="border-t border-border hover:bg-bg-hover/40 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/${type}/${row.id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {resultIconUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={resultIconUrl}
                                                            alt={row.name}
                                                            className="h-10 w-10 rounded-lg border border-border bg-bg-primary object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-primary">
                                                            {type === 'cooking'
                                                                ? <ChefHat size={16} className={getPrimaryAccent(type)} />
                                                                : <FlaskConical size={16} className={getPrimaryAccent(type)} />}
                                                        </div>
                                                    )}
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/${type}/${row.id}`}
                                                        className="font-semibold text-primary hover:text-gold transition-colors"
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        {row.name}
                                                    </Link>
                                                    <p className="truncate text-xs text-secondary">
                                                        {row.possibleInputs.slice(0, 3).join(' • ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleFavorite(type, row.id);
                                                }}
                                            >
                                                <Heart
                                                    size={16}
                                                    className={row.favorite ? 'fill-red-500 text-red-500' : 'text-muted hover:text-red-400'}
                                                />
                                            </button>
                                        </td>

                                        <td className="px-4 py-3 text-right font-mono font-semibold">
                                            <span className={row.silverPerHour >= 0 ? 'text-profit' : 'text-loss'}>
                                                {formatNumber(row.silverPerHour)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-primary">
                                            {formatNumber(row.marketPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center gap-1 font-mono ${row.priceChange === null ? 'text-muted' : row.priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
                                                {row.priceChange !== null && (row.priceChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                                                {formatSignedPercent(row.priceChange)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-secondary">
                                            {formatNumber(row.dailyVolume)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center gap-1 font-mono ${row.volumeChange === null ? 'text-muted' : row.volumeChange >= 0 ? 'text-profit' : 'text-loss'}`}>
                                                {row.volumeChange !== null && (row.volumeChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                                                {formatSignedPercent(row.volumeChange)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/${type}/xp?recipe=${row.id}&xp=${row.experience}`}
                                                className="rounded-full bg-profit/10 px-2.5 py-1 text-xs font-mono font-semibold text-profit hover:bg-profit/20 transition-colors"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {formatNumber(row.experience)}
                                            </Link>
                                        </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 border-t border-border p-4">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(current - 1, 0))}
                            disabled={currentPage === 0}
                            className="rounded-lg border border-border bg-bg-hover p-2 text-secondary hover:text-primary disabled:opacity-30"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                            const pageNumber = currentPage < 3 ? index : currentPage - 2 + index;
                            if (pageNumber >= totalPages) {
                                return null;
                            }

                            return (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    onClick={() => setPage(pageNumber)}
                                    className={`h-9 w-9 rounded-lg border text-sm font-mono transition-colors ${pageNumber === currentPage
                                        ? 'border-gold bg-gold/10 text-gold'
                                        : 'border-border bg-bg-hover text-secondary hover:text-primary'
                                        }`}
                                >
                                    {pageNumber + 1}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
                            disabled={currentPage === totalPages - 1}
                            className="rounded-lg border border-border bg-bg-hover p-2 text-secondary hover:text-primary disabled:opacity-30"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

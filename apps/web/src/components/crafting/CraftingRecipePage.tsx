'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    ChefHat,
    Clock3,
    FlaskConical,
    Package2,
    Settings2,
    Sparkles,
    Scale,
    TreePine,
    type LucideIcon,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { trpc } from '@/lib/trpc';
import { resolveBdoIconUrl } from '@/lib/icon-url';
import {
    buildRecipeTree,
    flattenLeafInputsWithLookup,
    formatRecipeTime,
    getGradeClass,
    getItemPriceBreakdown,
    getWeightSummary,
    mapGlobalSettingsToCraftingSettings,
    toNumber,
    type CalculatorRecipe,
    type LeafInputRow,
    type RecipeTreeNode,
} from '@/lib/crafting/calculator';
import { useCraftingCalculatorStore, type CraftingCalculatorStore } from '@/stores/crafting-calculator-store';
import { useGlobalSettings } from '@/stores/global-settings-store';

type DetailTab = 'inputs' | 'outputs' | 'analytics' | 'weight';

interface CraftingRecipePageProps {
    recipeId: number;
}

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: LucideIcon }> = [
    { id: 'inputs', label: 'Inputs', icon: Package2 },
    { id: 'outputs', label: 'Outputs', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: TreePine },
    { id: 'weight', label: 'Weight', icon: Scale },
];

function TreeNodeView({
    node,
    onToggleCollapse,
    onToggleRareProc,
    onToggleSlowCook,
    onSelectMaterial,
    collapsedIds,
    useRareProcIds,
    slowCookedIds,
}: {
    node: RecipeTreeNode;
    onToggleCollapse: (recipeId: number) => void;
    onToggleRareProc: (recipeId: number) => void;
    onToggleSlowCook: (recipeId: number) => void;
    onSelectMaterial: (recipeId: number, slotIndex: number, itemId: number) => void;
    collapsedIds: number[];
    useRareProcIds: number[];
    slowCookedIds: number[];
}) {
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

function SettingsPanel({ type }: { type: 'cooking' | 'alchemy' }) {
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

function SummaryCard({
    label,
    value,
    tone = 'text-primary',
}: {
    label: string;
    value: string;
    tone?: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-secondary">{label}</p>
            <p className={`mt-2 font-mono text-xl font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

function InputTable({
    inputs,
    state,
    onToggleTaxedItem,
    onSetCustomPrice,
}: {
    inputs: LeafInputRow[];
    state: CraftingCalculatorStore;
    onToggleTaxedItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-secondary">
                    <tr>
                        <th className="px-4 py-3 text-left">Material</th>
                        <th className="px-4 py-3 text-right">Qtd</th>
                        <th className="px-4 py-3 text-right">Preço</th>
                        <th className="px-4 py-3 text-center">Tax</th>
                        <th className="px-4 py-3 text-right">Custo</th>
                    </tr>
                </thead>
                <tbody>
                    {inputs.map((input) => {
                        const inputIconUrl = resolveBdoIconUrl(input.iconUrl);

                        return (
                            <tr key={input.itemId} className="border-t border-border">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {inputIconUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={inputIconUrl} alt={input.name} className="h-9 w-9 rounded-lg border border-border bg-bg-primary" />
                                        ) : (
                                            <div className="h-9 w-9 rounded-lg border border-border bg-bg-primary" />
                                        )}
                                    <div>
                                        <p className="font-medium text-primary">{input.name}</p>
                                        <p className="text-xs text-secondary">Peso {input.weightPerUnit.toFixed(2)} LT</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-primary">{input.quantity.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                                <input
                                    type="number"
                                    value={state.customPrices[input.itemId] ?? input.unitPrice}
                                    onChange={(event) => onSetCustomPrice(input.itemId, Number(event.target.value))}
                                    className="w-28 rounded-lg border border-border bg-bg-primary px-2 py-1 text-right font-mono text-sm text-primary focus:outline-none focus:border-gold"
                                />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <input
                                    type="checkbox"
                                    checked={state.taxedItemIds.includes(input.itemId)}
                                    onChange={() => onToggleTaxedItem(input.itemId)}
                                    className="size-4 accent-[var(--color-gold)]"
                                />
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-loss">
                                {input.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function CraftingRecipePage({ recipeId }: CraftingRecipePageProps) {
    const router = useRouter();
    const settings = useGlobalSettings();
    const calculatorStore = useCraftingCalculatorStore();
    const [activeTab, setActiveTab] = useState<DetailTab>('inputs');
    const [showSettings, setShowSettings] = useState(false);
    const { data: recipes, isLoading } = trpc.recipe.catalog.useQuery({
        types: ['cooking', 'alchemy', 'processing'],
        historyDays: 28,
    });

    const recipe = useMemo(
        () => (recipes ?? []).find((entry) => entry.id === recipeId) as CalculatorRecipe | undefined,
        [recipeId, recipes],
    );

    const craftingSettings = useMemo(
        () => mapGlobalSettingsToCraftingSettings(settings),
        [settings],
    );

    const craftQuantity = calculatorStore.craftQuantities[recipeId] ?? 1000;
    const tree = useMemo(() => {
        if (!recipes || !recipe) {
            return null;
        }

        return buildRecipeTree({
            recipes: recipes as CalculatorRecipe[],
            rootRecipeId: recipe.id,
            craftQuantity,
            settings: craftingSettings,
            state: calculatorStore,
        });
    }, [calculatorStore, craftQuantity, craftingSettings, recipe, recipes]);

    const leafInputs = useMemo(
        () => tree && recipes ? flattenLeafInputsWithLookup(tree, recipes as CalculatorRecipe[], calculatorStore) : [],
        [calculatorStore, recipes, tree],
    );

    const weightSummary = useMemo(
        () => getWeightSummary(leafInputs, craftQuantity, craftingSettings),
        [craftQuantity, craftingSettings, leafInputs],
    );

    const historyData = useMemo(() => (
        recipe?.resultItem.priceHistory?.slice().reverse().map((point) => ({
            date: new Date(point.recordedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            price: toNumber(point.price),
            volume: toNumber(point.volume),
        })) ?? []
    ), [recipe?.resultItem.priceHistory]);

    const profitChartData = tree ? [
        { label: 'Custo', value: tree.craftingCost },
        { label: 'Receita', value: tree.totalRevenue },
        { label: 'Lucro', value: tree.craftingProfit },
    ] : [];

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="skeleton h-10 w-1/3" />
                <div className="skeleton h-96 w-full" />
            </div>
        );
    }

    if (!recipe || !tree) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <p className="text-lg text-secondary">Receita não encontrada.</p>
                <button type="button" onClick={() => router.back()} className="rounded-xl border border-border bg-bg-hover px-4 py-2 text-primary">
                    Voltar
                </button>
            </div>
        );
    }

    const Icon = recipe.type === 'alchemy' ? FlaskConical : ChefHat;
    const resultPrice = getItemPriceBreakdown(recipe.resultItem, calculatorStore).unitPrice;
    const resultIconUrl = resolveBdoIconUrl(recipe.resultItem.iconUrl);

    return (
        <div className="flex flex-col gap-6 pb-24">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-full border border-border bg-bg-hover p-2 text-secondary hover:text-primary"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-4">
                        {resultIconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={resultIconUrl}
                                alt={recipe.name}
                                className="h-14 w-14 rounded-2xl border border-border bg-bg-primary"
                            />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-primary">
                                <Icon size={22} className={recipe.type === 'alchemy' ? 'text-info' : 'text-gold'} />
                            </div>
                        )}

                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-primary">{recipe.name}</h1>
                                <span className={`grade-badge ${getGradeClass(recipe.resultItem.grade)}`}>
                                    {recipe.type}
                                </span>
                            </div>
                            <p className="text-sm text-secondary mt-1">
                                Resultado base: {recipe.resultQuantity} • Preço mercado: {resultPrice.toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 rounded-2xl border border-border bg-bg-hover px-4 py-3 text-sm text-primary">
                        <Sparkles size={16} className="text-gold" />
                        Craft Qty
                        <input
                            type="number"
                            value={craftQuantity}
                            onChange={(event) => calculatorStore.setCraftQuantity(recipeId, Number(event.target.value))}
                            className="w-24 bg-transparent text-right font-mono focus:outline-none"
                        />
                    </label>

                    {recipe.type === 'cooking' && (
                        <label className="flex items-center gap-2 rounded-2xl border border-border bg-bg-hover px-4 py-3 text-sm text-primary">
                            <Clock3 size={16} className="text-gold" />
                            Slow cook
                            <input
                                type="checkbox"
                                checked={calculatorStore.slowCookedIds.includes(recipeId)}
                                onChange={() => calculatorStore.toggleSlowCook(recipeId)}
                                className="size-4 accent-[var(--color-gold)]"
                            />
                        </label>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowSettings((current) => !current)}
                        className="rounded-2xl border border-border bg-bg-hover px-4 py-3 text-sm text-primary hover:border-gold transition-colors"
                    >
                        {showSettings ? 'Árvore' : 'Settings'}
                    </button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_420px]">
                <div className="space-y-6">
                    <div className="card overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-hover/20 p-3">
                            {DETAIL_TABS.map(({ id, label, icon: TabIcon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveTab(id)}
                                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${activeTab === id
                                        ? 'bg-gold/10 text-gold'
                                        : 'text-secondary hover:text-primary'
                                        }`}
                                >
                                    <TabIcon size={15} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4">
                            {activeTab === 'inputs' && (
                                <InputTable
                                    inputs={leafInputs}
                                    state={calculatorStore}
                                    onToggleTaxedItem={calculatorStore.toggleTaxedItem}
                                    onSetCustomPrice={calculatorStore.setCustomPrice}
                                />
                            )}

                            {activeTab === 'outputs' && (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="text-xs uppercase text-secondary">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Saída</th>
                                                <th className="px-4 py-3 text-right">Qtd</th>
                                                <th className="px-4 py-3 text-right">Preço</th>
                                                <th className="px-4 py-3 text-center">Keep</th>
                                                <th className="px-4 py-3 text-right">Retorno</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tree.outputs.map((output) => (
                                                <tr key={`${output.kind}-${output.itemId}`} className="border-t border-border">
                                                    <td className="px-4 py-3 text-primary">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{output.name}</span>
                                                            <span className="text-xs text-secondary">{output.kind}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-primary">{output.quantity.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={calculatorStore.customPrices[output.itemId] ?? output.unitPrice}
                                                            onChange={(event) => calculatorStore.setCustomPrice(output.itemId, Number(event.target.value))}
                                                            className="w-28 rounded-lg border border-border bg-bg-primary px-2 py-1 text-right font-mono text-sm text-primary focus:outline-none focus:border-gold"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={calculatorStore.keptItemIds.includes(output.itemId)}
                                                            onChange={() => calculatorStore.toggleKeptItem(output.itemId)}
                                                            className="size-4 accent-[var(--color-gold)]"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-profit">
                                                        {output.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'analytics' && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <SummaryCard label="Crafting Cost" value={tree.craftingCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} tone="text-loss" />
                                        <SummaryCard label="Crafting Profit" value={tree.craftingProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} tone={tree.craftingProfit >= 0 ? 'text-profit' : 'text-loss'} />
                                        <SummaryCard label="Profit / Hour" value={tree.profitPerHour.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} tone={tree.profitPerHour >= 0 ? 'text-profit' : 'text-loss'} />
                                        <SummaryCard label="Time" value={formatRecipeTime(tree.totalTime)} tone="text-info" />
                                    </div>

                                    <div className="grid gap-6 xl:grid-cols-2">
                                        <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
                                            <p className="mb-4 text-sm font-semibold text-primary">Histórico de preço</p>
                                            <div className="h-72">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={historyData}>
                                                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                                        <XAxis dataKey="date" tick={{ fill: '#8892a8', fontSize: 12 }} />
                                                        <YAxis tick={{ fill: '#8892a8', fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Line type="monotone" dataKey="price" stroke="#d4a843" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
                                            <p className="mb-4 text-sm font-semibold text-primary">Composição econômica</p>
                                            <div className="h-72">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={profitChartData}>
                                                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                                        <XAxis dataKey="label" tick={{ fill: '#8892a8', fontSize: 12 }} />
                                                        <YAxis tick={{ fill: '#8892a8', fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'weight' && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <SummaryCard label="Peso disponível" value={`${weightSummary.availableWeight.toFixed(1)} LT`} />
                                        <SummaryCard label="Peso do lote" value={`${weightSummary.totalWeight.toFixed(1)} LT`} />
                                        <SummaryCard label="Peso por craft" value={`${weightSummary.weightPerCraft.toFixed(2)} LT`} />
                                        <SummaryCard label="Max crafts" value={weightSummary.maxCrafts.toLocaleString('pt-BR')} tone="text-gold" />
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="text-xs uppercase text-secondary">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Item</th>
                                                    <th className="px-4 py-3 text-right">Qtd</th>
                                                    <th className="px-4 py-3 text-right">Peso un.</th>
                                                    <th className="px-4 py-3 text-right">Peso total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leafInputs.map((input) => (
                                                    <tr key={input.itemId} className="border-t border-border">
                                                        <td className="px-4 py-3 text-primary">{input.name}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-primary">{input.quantity.toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-secondary">{input.weightPerUnit.toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-primary">
                                                            {(input.quantity * input.weightPerUnit).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-px border-t border-border bg-border md:grid-cols-4">
                            <div className="bg-bg-hover/10 p-4">
                                <p className="text-[11px] uppercase tracking-wider text-secondary">Cost</p>
                                <p className="mt-1 font-mono text-lg text-loss">{tree.craftingCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="bg-bg-hover/10 p-4">
                                <p className="text-[11px] uppercase tracking-wider text-secondary">Profit</p>
                                <p className={`mt-1 font-mono text-lg ${tree.craftingProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {tree.craftingProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="bg-bg-hover/10 p-4">
                                <p className="text-[11px] uppercase tracking-wider text-secondary">Profit / H</p>
                                <p className={`mt-1 font-mono text-lg ${tree.profitPerHour >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {tree.profitPerHour.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="bg-bg-hover/10 p-4">
                                <p className="text-[11px] uppercase tracking-wider text-secondary">Time</p>
                                <p className="mt-1 font-mono text-lg text-info">{formatRecipeTime(tree.totalTime)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {showSettings ? (
                        <SettingsPanel type={recipe.type === 'alchemy' ? 'alchemy' : 'cooking'} />
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
                                <h3 className="mb-4 text-sm font-semibold text-primary flex items-center gap-2">
                                    <TreePine size={16} className="text-gold" />
                                    Árvore da Receita
                                </h3>

                                <TreeNodeView
                                    node={tree}
                                    onToggleCollapse={calculatorStore.toggleCollapsed}
                                    onToggleRareProc={calculatorStore.toggleRareProc}
                                    onToggleSlowCook={calculatorStore.toggleSlowCook}
                                    onSelectMaterial={calculatorStore.setSelectedMaterial}
                                    collapsedIds={calculatorStore.collapsedIds}
                                    useRareProcIds={calculatorStore.useRareProcIds}
                                    slowCookedIds={calculatorStore.slowCookedIds}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

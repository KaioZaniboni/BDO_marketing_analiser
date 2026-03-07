'use client';

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
import { resolveBdoIconUrl } from '@/lib/icon-url';
import {
    formatRecipeTime,
    getWeightSummary,
    type CraftingCalculatorState,
    type LeafInputRow,
    type RecipeTreeNode,
} from '@/lib/crafting/calculator';
import type { DetailTab } from './CraftingRecipeTabs';

type HistoryPoint = {
    date: string;
    price: number;
    volume: number;
};

type ProfitChartPoint = {
    label: string;
    value: number;
};

function SummaryCard({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
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
    state: Pick<CraftingCalculatorState, 'customPrices' | 'taxedItemIds'>;
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

function OutputTable({
    outputs,
    customPrices,
    keptItemIds,
    onToggleKeptItem,
    onSetCustomPrice,
}: {
    outputs: RecipeTreeNode['outputs'];
    customPrices: CraftingCalculatorState['customPrices'];
    keptItemIds: number[];
    onToggleKeptItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    return (
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
                    {outputs.map((output) => (
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
                                    value={customPrices[output.itemId] ?? output.unitPrice}
                                    onChange={(event) => onSetCustomPrice(output.itemId, Number(event.target.value))}
                                    className="w-28 rounded-lg border border-border bg-bg-primary px-2 py-1 text-right font-mono text-sm text-primary focus:outline-none focus:border-gold"
                                />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <input
                                    type="checkbox"
                                    checked={keptItemIds.includes(output.itemId)}
                                    onChange={() => onToggleKeptItem(output.itemId)}
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
    );
}

function AnalyticsPanel({ tree, historyData, profitChartData }: { tree: RecipeTreeNode; historyData: HistoryPoint[]; profitChartData: ProfitChartPoint[] }) {
    return (
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
    );
}

function WeightPanel({ leafInputs, weightSummary }: { leafInputs: LeafInputRow[]; weightSummary: ReturnType<typeof getWeightSummary> }) {
    return (
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
                                <td className="px-4 py-3 text-right font-mono text-primary">{(input.quantity * input.weightPerUnit).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function DetailSummaryGrid({ tree }: { tree: RecipeTreeNode }) {
    return (
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
    );
}

export function DetailTabContent({
    activeTab,
    leafInputs,
    customPrices,
    taxedItemIds,
    keptItemIds,
    tree,
    weightSummary,
    historyData,
    profitChartData,
    onToggleTaxedItem,
    onToggleKeptItem,
    onSetCustomPrice,
}: {
    activeTab: DetailTab;
    leafInputs: LeafInputRow[];
    customPrices: CraftingCalculatorState['customPrices'];
    taxedItemIds: number[];
    keptItemIds: number[];
    tree: RecipeTreeNode;
    weightSummary: ReturnType<typeof getWeightSummary>;
    historyData: HistoryPoint[];
    profitChartData: ProfitChartPoint[];
    onToggleTaxedItem: (itemId: number) => void;
    onToggleKeptItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    if (activeTab === 'inputs') {
        return (
            <InputTable
                inputs={leafInputs}
                state={{ customPrices, taxedItemIds }}
                onToggleTaxedItem={onToggleTaxedItem}
                onSetCustomPrice={onSetCustomPrice}
            />
        );
    }

    if (activeTab === 'outputs') {
        return (
            <OutputTable
                outputs={tree.outputs}
                customPrices={customPrices}
                keptItemIds={keptItemIds}
                onToggleKeptItem={onToggleKeptItem}
                onSetCustomPrice={onSetCustomPrice}
            />
        );
    }

    if (activeTab === 'analytics') {
        return <AnalyticsPanel tree={tree} historyData={historyData} profitChartData={profitChartData} />;
    }

    return <WeightPanel leafInputs={leafInputs} weightSummary={weightSummary} />;
}
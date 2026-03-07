'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatRecipeTime, type RecipeTreeNode } from '@/lib/crafting/calculator';
import { type HistoryPoint, type ProfitChartPoint, SummaryCard, formatSilver } from './CraftingRecipeDetailShared';

export function AnalyticsPanel({
    tree,
    historyData,
    profitChartData,
}: {
    tree: RecipeTreeNode;
    historyData: HistoryPoint[];
    profitChartData: ProfitChartPoint[];
}) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Custo do lote" value={formatSilver(tree.craftingCost)} tone="text-loss" />
                <SummaryCard label="Lucro do lote" value={formatSilver(tree.craftingProfit)} tone={tree.craftingProfit >= 0 ? 'text-profit' : 'text-loss'} />
                <SummaryCard label="Lucro / hora" value={formatSilver(tree.profitPerHour)} tone={tree.profitPerHour >= 0 ? 'text-profit' : 'text-loss'} />
                <SummaryCard label="Tempo total" value={formatRecipeTime(tree.totalTime)} tone="text-info" />
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
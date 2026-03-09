'use client';

import { getWeightSummary, type LeafInputRow } from '@/lib/crafting/calculator';
import { SummaryCard } from './CraftingRecipeDetailShared';

export function WeightPanel({
    leafInputs,
    weightSummary,
}: {
    leafInputs: LeafInputRow[];
    weightSummary: ReturnType<typeof getWeightSummary>;
}) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Peso disponível" value={`${weightSummary.availableWeight.toFixed(1)} LT`} />
                <SummaryCard label="Peso do lote" value={`${weightSummary.totalWeight.toFixed(1)} LT`} />
                <SummaryCard label="Peso por craft" value={`${weightSummary.weightPerCraft.toFixed(2)} LT`} />
                <SummaryCard label="Máx. crafts" value={weightSummary.maxCrafts.toLocaleString('pt-BR')} tone="text-gold" />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-secondary">
                        <tr>
                            <th className="px-4 py-4 text-left">Item</th>
                            <th className="px-4 py-4 text-right">Qtd</th>
                            <th className="px-4 py-4 text-right">Peso un.</th>
                            <th className="px-4 py-4 text-right">Peso total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leafInputs.map((input) => (
                            <tr key={input.itemId} className="border-t border-border">
                                <td className="px-4 py-4 text-primary">{input.name}</td>
                                <td className="px-4 py-4 text-right font-mono text-primary">{input.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right font-mono text-secondary">{input.weightPerUnit.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right font-mono text-primary">{(input.quantity * input.weightPerUnit).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

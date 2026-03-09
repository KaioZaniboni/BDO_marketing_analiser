'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useGlobalSettings } from '@/stores/global-settings-store';
import { useState, useMemo } from 'react';
import { ArrowLeft, Hammer, TreePine } from 'lucide-react';
import Link from 'next/link';

interface ProcessingPriceSnapshot {
    basePrice?: bigint | number | null;
    lastSoldPrice?: bigint | number | null;
}

interface ProcessingItem {
    name?: string | null;
    prices?: ProcessingPriceSnapshot[];
}

interface ProcessingIngredientOption {
    itemId: number;
    quantity: number;
    item?: ProcessingItem | null;
    subRecipeId?: number | null;
    subRecipeType?: string | null;
}

interface ProcessingRecipeData {
    id: number;
    name: string;
    ingredients?: ProcessingIngredientOption[];
    ingredientAlternatives?: Record<number, ProcessingIngredientOption[]>;
    resultItem?: ProcessingItem | null;
    resultItemId: number;
    resultQuantity?: number | null;
}

interface ProcessingCalculatedIngredient {
    id: number;
    name: string;
    quantity: number;
    totalQty: number;
    unitPrice: number;
    totalCost: number;
    alternatives: ProcessingIngredientOption[];
    slotIndex: number;
    subRecipeId?: number | null;
    subRecipeType?: string | null;
}

export default function ProcessingRecipeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const recipeId = parseInt(params.id as string);
    const settings = useGlobalSettings();
    const [batchSize, setBatchSize] = useState(100);
    const [selectedIngredients, setSelectedIngredients] = useState<Record<number, number>>({});

    const { data: recipeData, isLoading } = trpc.recipe.getById.useQuery({ recipeId });
    const recipe = recipeData as ProcessingRecipeData | undefined;

    const calc = useMemo(() => {
        if (!recipe) return null;
        let taxRate = 0.35;
        if (settings.hasValuePack) taxRate *= 0.70;
        if (settings.hasMerchantRing) taxRate -= 0.05;
        taxRate -= Math.min(settings.familyFame / 400_000, 0.005);
        taxRate = Math.max(taxRate, 0);
        const netMultiplier = 1 - taxRate;
        const ingredients: ProcessingCalculatedIngredient[] = (recipe.ingredients ?? []).map((baseIng, idx) => {
            const alternatives = recipe.ingredientAlternatives?.[idx] || [baseIng];
            const selectedItemId = selectedIngredients[idx];
            let activeIng = baseIng;

            if (selectedItemId) {
                const found = alternatives.find((alternative) => alternative.itemId === selectedItemId);
                if (found) activeIng = found;
            }

            const unitPrice = Number(activeIng.item?.prices?.[0]?.lastSoldPrice ?? activeIng.item?.prices?.[0]?.basePrice ?? 0);
            const totalQty = activeIng.quantity * batchSize;
            return {
                id: activeIng.itemId,
                name: activeIng.item?.name ?? `Item ${activeIng.itemId}`,
                quantity: activeIng.quantity,
                totalQty,
                unitPrice,
                totalCost: totalQty * unitPrice,
                alternatives,
                slotIndex: idx,
                subRecipeId: activeIng.subRecipeId,
                subRecipeType: activeIng.subRecipeType
            };
        });
        const totalCost = ingredients.reduce((sum, ingredient) => sum + ingredient.totalCost, 0);
        const resultPrice = Number(recipe.resultItem?.prices?.[0]?.basePrice ?? 0);
        const resultQty = (recipe.resultQuantity ?? 1) * batchSize;
        const totalRevenue = resultQty * resultPrice * netMultiplier;
        const profit = totalRevenue - totalCost;

        // Processing estimated 10s base tempo massivo (AFK)
        const processingTime = 10;
        const silverPerHour = processingTime > 0 ? (profit / (processingTime * (batchSize / 100))) * 3600 : 0;
        const totalTime = processingTime * (batchSize / 100); // 1 mass process per 100? Using simplifying rule
        return { ingredients, totalCost, resultPrice, resultQty, totalRevenue, profit, silverPerHour, totalTime };
    }, [recipe, batchSize, selectedIngredients, settings]);

    if (isLoading) return <div className="flex flex-col gap-6 animate-pulse"><div className="h-8 bg-bg-hover w-1/3 rounded" /><div className="h-64 bg-bg-hover w-full rounded-xl" /></div>;
    if (!recipe || !calc) return <div className="text-center py-20"><h2 className="text-xl text-secondary">Receita não encontrada.</h2><button onClick={() => router.back()} className="mt-4 text-orange-400 hover:underline">Voltar</button></div>;

    return (
        <div className="flex flex-col gap-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-bg-hover rounded-full transition-colors"><ArrowLeft size={20} className="text-secondary" /></button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1"><Hammer size={24} className="text-orange-400" /><h1 className="text-2xl font-bold text-primary">{recipe.name}</h1></div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-secondary">Qtd Processamentos:</label>
                    <input type="number" value={batchSize} onChange={e => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 bg-bg-hover border border-border rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:border-orange-400" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 xl:col-span-8">
                    <div className="card">
                        <div className="p-5 bg-bg-hover/30 border-b border-border"><h3 className="font-semibold text-sm uppercase tracking-wider text-secondary">Ações & Ingredientes (Entrada)</h3></div>
                        <div className="p-5">
                            <table className="w-full text-sm"><thead className="text-xs text-secondary uppercase"><tr><th className="text-left pb-4">Qtd x Ação</th><th className="text-left pb-4">Nome (Trocar Variante)</th><th className="text-right pb-4">Preço Un.</th><th className="text-right pb-4">Custo Lote</th></tr></thead>
                                <tbody>{calc.ingredients.map((ing) => (
                                    <tr key={ing.slotIndex} className="border-t border-border/50 hover:bg-bg-hover/30 transition-colors align-top">
                                        <td className="py-4 font-mono text-primary"><span className="text-orange-400 mr-2">{ing.quantity}x</span>{(ing.totalQty).toLocaleString('pt-BR')}</td>
                                        <td className="py-4 text-primary pr-4">
                                            {ing.alternatives.length > 1 ? (
                                                <select
                                                    className="bg-bg-elevated border border-border rounded text-sm text-primary px-3 py-2.5 focus:border-orange-400 outline-none w-full max-w-sm"
                                                    value={ing.id}
                                                    onChange={(e) => setSelectedIngredients(prev => ({ ...prev, [ing.slotIndex]: parseInt(e.target.value) }))}
                                                >
                                                    {ing.alternatives.map((alt) => {
                                                        const altPrice = Number(alt.item?.prices?.[0]?.lastSoldPrice ?? alt.item?.prices?.[0]?.basePrice ?? 0);
                                                        const isZero = altPrice === 0 ? " (S/ Mercado)" : "";
                                                        return (
                                                            <option key={alt.itemId} value={alt.itemId}>
                                                                [{alt.quantity}x] {alt.item?.name}{isZero}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            ) : (
                                                <span className="font-medium leading-6">{ing.name}</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right font-mono text-secondary">{ing.unitPrice.toLocaleString('pt-BR')}</td>
                                        <td className="py-4 text-right font-mono text-loss">{ing.totalCost.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">
                    <div className="card">
                        <div className="p-5 bg-bg-hover/30 border-b border-border"><h3 className="font-semibold text-sm uppercase tracking-wider text-secondary">Saída Bruta</h3></div>
                        <div className="p-5">
                            <table className="w-full text-sm"><thead className="text-xs text-secondary uppercase"><tr><th className="text-left pb-4">Retorno (Lote)</th><th className="text-left pb-4">Produto</th><th className="text-right pb-4">Valor Total</th></tr></thead>
                                <tbody><tr className="border-t border-border/50"><td className="py-4 font-mono text-primary"><span className="text-profit mr-2">≈{recipe.resultQuantity}x</span>{calc.resultQty.toLocaleString('pt-BR')}</td><td className="py-4 font-medium text-primary">{recipe.resultItem?.name ?? `Item ${recipe.resultItemId}`}</td><td className="py-4 text-right font-mono text-profit font-bold">{calc.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td></tr></tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card flex-1">
                        <div className="p-5 bg-bg-hover/30 border-b border-border flex items-center gap-2"><TreePine size={16} className="text-orange-400" /><h3 className="font-semibold text-sm uppercase tracking-wider text-secondary">Receituário Expandido</h3></div>
                        <div className="p-5 space-y-4 text-sm">{calc.ingredients.map((ing) => (<div key={ing.slotIndex} className="flex items-start gap-3 py-3.5 px-4 rounded-xl bg-bg-hover/20 border border-border/50"><span className="font-mono text-xs text-muted w-10 pt-0.5">{ing.quantity}x</span><span className="text-primary flex-1 font-medium leading-6">{ing.name}</span>{ing.subRecipeId && (<Link href={`/${ing.subRecipeType}/${ing.subRecipeId}`} className="text-[10px] bg-bg-elevated border border-orange-400/50 text-orange-400 px-2.5 py-1 rounded hover:bg-orange-400/10 transition-colors uppercase text-center flex items-center min-h-6">Sub Receita</Link>)}</div>))}</div>
                    </div>
                </div>
            </div>

            {/* Float Bar */}
            <div className="fixed bottom-0 left-[260px] right-0 bg-bg-elevated border-t border-border px-8 py-4 z-50">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div><p className="text-[10px] uppercase text-secondary tracking-wider font-semibold">Despesa Global</p><p className="font-mono font-bold text-lg text-loss">-{calc.totalCost.toLocaleString('pt-BR')}</p></div>
                    <div><p className="text-[10px] uppercase text-secondary tracking-wider font-semibold">Lucratividade</p><p className={`font-mono font-bold text-lg ${calc.profit > 0 ? 'text-profit' : 'text-loss'}`}>{calc.profit > 0 ? '+' : ''}{calc.profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p></div>
                    <div><p className="text-[10px] uppercase text-secondary tracking-wider font-semibold text-orange-400">Prata / Hora AFK</p><p className={`font-mono font-bold text-lg ${calc.silverPerHour > 0 ? 'text-orange-400' : 'text-loss'}`}>{calc.silverPerHour.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p></div>
                </div>
            </div>
        </div>
    );
}

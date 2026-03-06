'use client';

import { useState, useMemo } from 'react';
import { Hammer, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useGlobalSettings } from '@/stores/global-settings-store';

const PAGE_SIZE = 20;

export default function ProcessingCalculatorPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<string>('silverPerHour');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(0);
    const settings = useGlobalSettings();

    const { data: recipes, isLoading } = trpc.recipe.list.useQuery({ type: 'processing' });

    const toggleSort = (col: string) => {
        if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortColumn(col); setSortDir('desc'); }
    };

    const enrichedRecipes = useMemo(() => {
        if (!recipes) return [];
        return recipes.map((r: any) => {
            const basePrice = Number(r.resultItem?.prices?.[0]?.basePrice ?? 0);
            const ingredientCost = (r.ingredients ?? []).reduce((sum: number, ing: any) => {
                return sum + (ing.quantity * Number(ing.item?.prices?.[0]?.basePrice ?? 0));
            }, 0);
            let taxRate = 0.35;
            if (settings.hasValuePack) taxRate *= 0.70;
            if (settings.hasMerchantRing) taxRate -= 0.05;
            taxRate = Math.max(taxRate, 0);
            const netMultiplier = 1 - taxRate;
            const revenue = basePrice * (r.resultQuantity ?? 1) * netMultiplier;
            const profit = revenue - ingredientCost;
            // Processing: ~10s por batch em tempo AFK
            const silverPerHour = profit > 0 ? (profit / 10) * 3600 : 0;
            return { ...r, basePrice, profit, silverPerHour, volume: Number(r.resultItem?.prices?.[0]?.totalTrades ?? 0) };
        });
    }, [recipes, settings]);

    const filtered = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let list = enrichedRecipes.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        list.sort((a: any, b: any) => {
            const aVal = (a as any)[sortColumn] ?? 0;
            const bVal = (b as any)[sortColumn] ?? 0;
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return list;
    }, [enrichedRecipes, searchTerm, sortColumn, sortDir]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const SortHeader = ({ col, label }: { col: string; label: string }) => (
        <th className="px-4 py-3 font-semibold cursor-pointer hover:text-gold transition-colors select-none" onClick={() => toggleSort(col)}>
            <span className="flex items-center gap-1 justify-end">{label}<ArrowUpDown size={12} className={sortColumn === col ? 'text-gold' : 'text-muted'} /></span>
        </th>
    );

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Hammer size={24} className="text-orange-400" /> Calculadora de Processamento
                </h1>
                <p className="text-sm text-secondary mt-1">Receitas de processamento focadas em lucro AFK. Valores estimados com base em ~10s por batch.</p>
            </div>

            <div className="card p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input type="text" placeholder="Pesquisar receita..." className="w-full bg-bg-hover border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-primary focus:outline-none focus:border-gold transition-colors" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} />
                </div>
                <p className="text-xs text-muted ml-auto">{filtered.length} receitas</p>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase bg-bg-hover text-secondary">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3 font-semibold">Nome</th>
                                <SortHeader col="silverPerHour" label="Prata/Hora (AFK)" />
                                <SortHeader col="basePrice" label="Preço no Mercado" />
                                <SortHeader col="volume" label="Volume" />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(8)].map((_, i) => (<tr key={i} className="border-t border-border"><td colSpan={5} className="px-4 py-3"><div className="skeleton h-7 w-full rounded" /></td></tr>))
                            ) : paginated.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-secondary">Nenhuma receita de processamento encontrada.</td></tr>
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ) : paginated.map((recipe: any) => (
                                <tr key={recipe.id} className="border-t border-border hover:bg-bg-hover/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/processing/${recipe.id}`}>
                                    <td className="px-4 py-3"><div className="w-8 h-8 rounded bg-bg-hover border border-border flex items-center justify-center"><Hammer size={14} className="text-muted" /></div></td>
                                    <td className="px-4 py-3 font-medium text-primary hover:text-orange-400 transition-colors capitalize">
                                        <div className="flex flex-col">
                                            <span>{recipe.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold"><span className={recipe.silverPerHour > 0 ? 'text-profit' : 'text-loss'}>{recipe.silverPerHour.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                                    <td className="px-4 py-3 text-right font-mono text-primary">{recipe.basePrice.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right font-mono text-secondary">{recipe.volume.toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded hover:bg-bg-hover disabled:opacity-30"><ChevronLeft size={18} /></button>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => { const pn = page < 3 ? i : page - 2 + i; if (pn >= totalPages) return null; return (<button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded text-sm font-mono font-bold ${pn === page ? 'bg-orange-500 text-white' : 'hover:bg-bg-hover text-secondary'}`}>{pn + 1}</button>); })}
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="p-2 rounded hover:bg-bg-hover disabled:opacity-30"><ChevronRight size={18} /></button>
                    </div>
                )}
            </div>
        </div>
    );
}

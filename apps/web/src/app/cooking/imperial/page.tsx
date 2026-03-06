'use client';

import { Crown, ChefHat } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useGlobalSettings } from '@/stores/global-settings-store';
import { getImperialBonus } from '@bdo/api/src/services/imperial-data';

export default function ImperialCookingPage() {
    const settings = useGlobalSettings();
    const { data: rankings, isLoading } = trpc.recipe.getImperialRanking.useQuery({
        type: 'cooking',
        mastery: settings.cookingMastery,
        taxConfig: {
            baseTaxRate: 0.35,
            hasValuePack: settings.hasValuePack,
            hasMerchantRing: settings.hasMerchantRing,
            familyFame: settings.familyFame,
        }
    });

    const masteryBonus = getImperialBonus(settings.cookingMastery);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Crown size={24} className="text-gold" />
                    Culinária Imperial
                </h1>
                <p className="text-sm text-secondary mt-1">
                    Cálculo exato de rentabilidade focado nas entregas ao NPC vs Venda no Mercado.
                </p>
            </div>

            {/* Info bar */}
            <div className="card p-4 flex gap-6 items-center text-sm">
                <div>
                    <span className="text-xs text-secondary">Maestria Culinária:</span>
                    <span className="ml-2 font-mono font-bold text-gold">{settings.cookingMastery}</span>
                </div>
                <div>
                    <span className="text-xs text-secondary">Bônus de Lucro Imperial:</span>
                    <span className="ml-2 font-mono font-bold text-profit">+{masteryBonus.toFixed(1)}%</span>
                </div>
            </div>

            {/* Tabela de Rankings Imperiais */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-bg-hover text-secondary">
                        <tr>
                            <th className="px-4 py-3">Receita / Item</th>
                            <th className="px-4 py-3">Caixa Imperial</th>
                            <th className="px-4 py-3 text-right">Venda Mercado (Caixa)</th>
                            <th className="px-4 py-3 text-right">Custo P/ Caixa</th>
                            <th className="px-4 py-3 text-right">Lucro Líquido Imperial</th>
                            <th className="px-4 py-3 text-right">Volume (Mercado)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-10 font-mono text-secondary">Carregando Mercado...</td></tr>
                        ) : rankings && rankings.length > 0 ? (
                            rankings.map(r => (
                                <tr key={r.id} className="border-t border-border hover:bg-bg-hover/50 transition-colors">
                                    <td className="px-4 py-3 text-primary font-medium flex gap-2 items-center">
                                        <ChefHat size={16} className="text-muted" />
                                        <span>{r.name}</span>
                                        <span className="text-[10px] bg-bg-hover px-1.5 py-0.5 rounded text-muted ml-2">x{r.boxInfo.qtyRequired}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-gold/10 text-gold px-2 py-1 rounded text-xs font-bold tracking-wide">
                                            {r.boxInfo.tier.name.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-secondary">
                                        {r.marketRevenuePerBox > 0 ? r.marketRevenuePerBox.toLocaleString('pt-BR') : 'S/ Preço'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-loss">
                                        {r.costPerBox > 0 ? r.costPerBox.toLocaleString('pt-BR') : 'S/ Preço'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold">
                                        <div className="flex flex-col items-end">
                                            <span className={r.profitPerBox > 0 ? 'text-profit' : 'text-loss'}>
                                                {r.profitPerBox > 0 ? '+' : ''}{r.profitPerBox.toLocaleString('pt-BR')}
                                            </span>
                                            <span className="text-[10px] text-muted font-normal mt-0.5" title="Preço Final Pago pelo NPC">
                                                (NPC Paga: {r.imperialBoxPrice.toLocaleString('pt-BR')})
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-secondary text-xs">
                                        {r.dailyVolume.toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={6} className="text-center py-10 text-secondary">Nenhuma receita imperial detectada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

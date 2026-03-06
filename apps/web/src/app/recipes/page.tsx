'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Trophy, TrendingUp, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import type { RankedRecipe } from '@bdo/api';

export default function RecipesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'cooking' | 'alchemy' | 'processing' | 'all'>('all');

    const { data: ranking, isLoading } = trpc.recipe.getRanking.useQuery({
        type: typeFilter === 'all' ? undefined : typeFilter,
        limit: 50,
    });

    const filteredRanking = ranking?.filter(recipe =>
        recipe.recipeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gold mb-1 flex items-center gap-2">
                    <Trophy size={24} />
                    Ranking de Receitas
                </h1>
                <p className="text-sm text-secondary">
                    Descubra as receitas mais lucrativas do mercado baseadas em ROI e liquidez.
                </p>
            </div>

            {/* Control Bar (Filters & Search) */}
            <div className="card p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar receita..."
                        className="w-full bg-bg-hover border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-primary focus:outline-none focus:border-gold transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Filter size={18} className="text-muted mr-2" />
                    {(['all', 'cooking', 'alchemy', 'processing'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${typeFilter === type
                                    ? 'bg-gold text-bg-primary'
                                    : 'bg-bg-hover text-secondary hover:text-primary'
                                }`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ranking Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase bg-bg-hover text-secondary">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Rank</th>
                                <th className="px-6 py-4 font-semibold">Receita</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold text-right">Lucro Bruto</th>
                                <th className="px-6 py-4 font-semibold text-right flex items-center justify-end gap-1">
                                    ROI <TrendingUp size={14} className="text-profit" />
                                </th>
                                <th className="px-6 py-4 font-semibold text-right">Score Liquidez</th>
                                <th className="px-6 py-4 font-semibold text-right">Score Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(10)].map((_, i) => (
                                    <tr key={i} className="border-t border-border">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="skeleton h-6 w-full rounded" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredRanking?.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                                        Nenhuma receita encontrada. Edite os filtros ou rode a seed/sincronização do BD.
                                    </td>
                                </tr>
                            ) : (
                                filteredRanking?.map((recipe: RankedRecipe) => (
                                    <tr
                                        key={recipe.recipeId}
                                        className="border-t border-border hover:bg-bg-hover/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${recipe.rank === 1 ? 'bg-gold/20 text-gold border border-gold/50' :
                                                    recipe.rank === 2 ? 'bg-silver/20 text-gray-300 border border-gray-500' :
                                                        recipe.rank === 3 ? 'bg-orange-900/40 text-orange-400 border border-orange-800' :
                                                            'text-muted font-mono'
                                                }`}>
                                                {recipe.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-primary">
                                            <Link href={`/recipes/${recipe.recipeId}`} className="hover:text-gold transition-colors">
                                                {recipe.recipeName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="grade-badge grade-white">
                                                {recipe.recipeType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium">
                                            <span className={recipe.grossProfit > 0 ? 'text-profit' : 'text-loss'}>
                                                {recipe.grossProfit.toLocaleString('pt-BR')}
                                                <span className="text-xs text-muted ml-1">S</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">
                                            <span className={recipe.roi > 0 ? 'text-profit' : 'text-loss'}>
                                                {recipe.roi > 0 ? '+' : ''}{recipe.roi.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-info">
                                            {recipe.liquidityScore.toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-gold">
                                            {recipe.compositeScore.toFixed(1)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

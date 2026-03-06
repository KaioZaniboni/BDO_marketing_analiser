'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ShoppingCart, Search, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function MarketExplorerPage() {
    const [searchQuery, setSearchQuery] = useState('');

    // Utiliza a procedure getHotList para a tela padrão e on-demand getRanking para buscas genéricas
    const { data: hotList, isLoading } = trpc.market.getHotList.useQuery();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Adicionar router pro /market/[itemId]
        alert('Busca detalhada em construção. Exibindo apenas a Hot List.');
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-gold flex items-center gap-2">
                    <ShoppingCart size={24} />
                    Explorador de Mercado (Hot List)
                </h1>
                <p className="text-sm text-secondary">
                    Veja os itens com maior flutuação e demanda no mercado central do BDO.
                </p>
            </div>

            {/* Search component */}
            <form onSubmit={handleSearch} className="card p-4">
                <div className="relative w-full max-w-2xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar item específico por ID ou Nome..."
                        className="w-full bg-bg-hover border border-border rounded-lg pl-10 pr-24 py-3 text-sm text-primary focus:outline-none focus:border-gold transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gold text-bg-primary font-semibold text-xs px-4 py-1.5 rounded"
                    >
                        Buscar
                    </button>
                </div>
            </form>

            {/* Hot list grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    [...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-lg" />)
                ) : !hotList || hotList.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-secondary">
                        Não foi possível carregar o Hot List no momento (Verifique a API do Arsha).
                    </div>
                ) : (
                    hotList.map((item) => (
                        <div key={item.id} className="card p-5 border-border hover:border-gold/30 transition-colors group cursor-pointer border-t-2 border-t-warning/50">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-primary">Item {item.id}</h3>
                                    <p className="text-[10px] text-muted font-mono mt-1">ID: {item.id}</p>
                                </div>
                                <div className="w-8 h-8 rounded bg-warning/10 text-warning flex items-center justify-center">
                                    <TrendingUp size={16} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Preço Atual</p>
                                    <p className="font-mono font-bold text-gold">{item.basePrice.toLocaleString('pt-BR')} S</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Estoque</p>
                                    <p className="font-mono font-bold text-primary">{item.currentStock.toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="mt-2">
                                    <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                        <Clock size={10} /> Última Venda
                                    </p>
                                    <p className="font-mono text-xs text-muted">
                                        {item.lastSoldTime ? new Date(item.lastSoldTime * 1000).toLocaleString('pt-BR') : '---'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

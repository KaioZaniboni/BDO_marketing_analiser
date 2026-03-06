'use client';

import { Trophy, TrendingUp, Package, Flame } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

/**
 * Dashboard — Página principal do BDO Market Analyzer.
 */
export default function DashboardPage() {
  const { data: ranking, isLoading: isRankingLoading } = trpc.recipe.getRanking.useQuery({ limit: 5 });
  const { data: summaryData } = trpc.inventory.summary.useQuery();
  const { data: hotList } = trpc.market.getHotList.useQuery();

  const bestRecipe = ranking?.[0];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Visão geral do mercado e oportunidades de lucro — Servidor SA
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: 'var(--color-gold)' }} />
            <span className="kpi-label">Melhor Receita</span>
          </div>
          <div className="kpi-value text-gold text-lg truncate pt-1">{bestRecipe?.recipeName || '—'}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Baseado no cenário atual
          </span>
        </div>

        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--color-profit)' }} />
            <span className="kpi-label">Melhor ROI</span>
          </div>
          <div className="kpi-value text-profit">{bestRecipe?.roi ? `${bestRecipe.roi.toFixed(1)}%` : '—%'}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Oportunidade Top #1
          </span>
        </div>

        <div className="card kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} style={{ color: 'var(--color-info)' }} />
            <span className="kpi-label">Valor do Inventário</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-info)' }}>
            {summaryData ? `${(summaryData.totalValue / 1000000).toFixed(1)}M` : '0'}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Silver Estimado
          </span>
        </div>

        <div className="card kpi-card">
          <div className="flex items-center justify-between mb-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} style={{ color: 'var(--color-warning)' }} />
              <span className="kpi-label">Itens no Hot List</span>
            </div>
            {hotList && hotList.length > 0 && (
              <span className="text-xs bg-warning/20 text-warning px-2 rounded font-bold">{hotList.length}</span>
            )}
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-warning)', fontSize: '1rem' }}>
            {hotList?.[0] ? `Item ${hotList[0].id}` : '—'}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Mais em alta no momento
          </span>
        </div>
      </div>

      {/* Seção: Top Receitas + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Top Receitas */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Trophy size={18} className="text-gold" /> To 5 Melhores Oportunidades
            </h2>
            <Link href="/recipes" className="text-xs text-gold hover:underline">Ver Tabela</Link>
          </div>
          <div className="flex flex-col gap-2">
            {isRankingLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '40px', width: '100%' }} />)
            ) : ranking && ranking.length > 0 ? (
              ranking.map((r, i) => (
                <Link key={r.recipeId} href={`/recipes/${r.recipeId}`}>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-bg-hover/30 hover:bg-bg-hover border border-border cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-muted font-mono font-bold text-sm">#{i + 1}</span>
                      <span className="font-medium text-primary group-hover:text-gold transition-colors">{r.recipeName}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-mono font-bold text-profit">+{r.roi.toFixed(1)}%</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-secondary text-center py-4">Sem dados ou você não atende aos pré-requisitos de itens.</p>
            )}
          </div>
        </div>

        {/* Hot list itens */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Flame size={18} className="text-warning" /> Mercado em Efervescência
          </h2>
          <div className="flex flex-col gap-2">
            {!hotList ? (
              [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '40px', width: '100%' }} />)
            ) : hotList.slice(0, 5).map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 rounded-lg bg-bg-hover/30 border border-border">
                <span className="font-medium text-primary text-sm">Item ID: {item.id}</span>
                <div className="flex gap-4">
                  <span className="text-xs text-secondary font-mono text-right">
                    Vol: <span className="text-primary">{item.totalTrades}</span>
                  </span>
                  <span className="text-xs text-gold font-mono font-bold">
                    {item.basePrice.toLocaleString('pt-BR')} S
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import type { OutputRow, PriceBreakdown } from '@/lib/crafting/calculator';

export type HistoryPoint = {
    date: string;
    price: number;
    volume: number;
};

export type ProfitChartPoint = {
    label: string;
    value: number;
};

type SourceMeta = {
    label: string;
    tone: string;
    description: string;
    compactDescription: string;
};

export const SOURCE_META: Record<PriceBreakdown['source'], SourceMeta> = {
    market: {
        label: 'Mercado',
        tone: 'border-info/30 bg-info/10 text-info',
        description: 'Preço vindo do mercado atual.',
        compactDescription: 'Mercado atual.',
    },
    custom: {
        label: 'Manual',
        tone: 'border-gold/30 bg-gold/10 text-gold',
        description: 'Preço ajustado manualmente nas configurações do cálculo.',
        compactDescription: 'Preço manual.',
    },
    vendor: {
        label: 'Vendor/NPC',
        tone: 'border-profit/30 bg-profit/10 text-profit',
        description: 'Item tratado como compra direta de vendor/NPC.',
        compactDescription: 'Compra vendor/NPC.',
    },
    missing: {
        label: 'Sem preço',
        tone: 'border-loss/30 bg-loss/10 text-loss',
        description: 'Sem preço confiável no mercado; revise manualmente se necessário.',
        compactDescription: 'Sem preço confiável.',
    },
};

export const OUTPUT_KIND_LABEL: Record<OutputRow['kind'], string> = {
    normal: 'Resultado principal',
    rare: 'Proc raro',
    byproduct: 'Subproduto',
};

export function formatSilver(value: number): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function SourceBadge({
    source,
    className = '',
}: {
    source: PriceBreakdown['source'];
    className?: string;
}) {
    const meta = SOURCE_META[source];

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone} ${className}`.trim()}>
            {meta.label}
        </span>
    );
}

export function SourceDescription({
    source,
    totalTrades,
    currentStock,
    variant = 'default',
}: {
    source: PriceBreakdown['source'];
    totalTrades: number;
    currentStock: number;
    variant?: 'default' | 'compact';
}) {
    const meta = SOURCE_META[source];

    if (variant === 'compact') {
        if (source === 'market') {
            return (
                <>
                    <span className="block">Mercado atual.</span>
                    <span className="block">Estoque: {formatSilver(currentStock)} • Trades: {formatSilver(totalTrades)}</span>
                </>
            );
        }

        return <span>{meta.compactDescription}</span>;
    }

    if (source === 'market') {
        return (
            <span>
                {meta.description} Estoque: {formatSilver(currentStock)} • Trades: {formatSilver(totalTrades)}
            </span>
        );
    }

    return <span>{meta.description}</span>;
}

export function SectionHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="mb-3 flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-primary">{title}</h3>
            <p className="text-xs text-secondary">{description}</p>
        </div>
    );
}

export function SummaryCard({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
    return (
        <div className="rounded-2xl border border-border bg-bg-hover/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-secondary">{label}</p>
            <p className={`mt-2 font-mono text-xl font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

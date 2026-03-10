'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc';
import { History, Package, Plus, Trash2 } from 'lucide-react';
import { InventoryOcrHistoryPanel, SELECTION_SOURCE_LABELS } from './inventory-ocr-history-panel';
import { InventoryScreenshotImportPanel } from './inventory-screenshot-import-panel';

const OCR_HISTORY_LIMIT_OPTIONS = [10, 20, 50] as const;
type OcrHistorySelectionSourceFilter = keyof typeof SELECTION_SOURCE_LABELS | 'all';

function buildOcrHistoryQueryInput(input: {
    limit: number;
    cursor: number | undefined;
    search: string;
    selectionSource: OcrHistorySelectionSourceFilter;
}) {
    const search = input.search.trim();

    return {
        limit: input.limit,
        ...(input.cursor ? { cursor: input.cursor } : {}),
        ...(search ? { search } : {}),
        ...(input.selectionSource !== 'all' ? { selectionSource: input.selectionSource } : {}),
    };
}

export default function InventoryPage() {
    const [itemId, setItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [activeSection, setActiveSection] = useState<'inventory' | 'ocr-history'>('inventory');
    const [ocrHistoryLimit, setOcrHistoryLimit] = useState(20);
    const [ocrHistorySearch, setOcrHistorySearch] = useState('');
    const [ocrHistorySelectionSource, setOcrHistorySelectionSource] = useState<OcrHistorySelectionSourceFilter>('all');
    const [ocrHistoryCursorStack, setOcrHistoryCursorStack] = useState<Array<number | undefined>>([undefined]);
    const { data: session, status } = useSession();
    const hasSession = status === 'authenticated';
    const currentOcrHistoryCursor = ocrHistoryCursorStack[ocrHistoryCursorStack.length - 1];
    const ocrHistoryQueryInput = buildOcrHistoryQueryInput({
        limit: ocrHistoryLimit,
        cursor: currentOcrHistoryCursor,
        search: ocrHistorySearch,
        selectionSource: ocrHistorySelectionSource,
    });
    const hasOcrHistoryFilters = ocrHistorySearch.trim().length > 0 || ocrHistorySelectionSource !== 'all';

    const utils = trpc.useUtils();
    const { data: inventory, isLoading } = trpc.inventory.list.useQuery(undefined, {
        enabled: hasSession,
        retry: false,
    });
    const { data: summaryData } = trpc.inventory.summary.useQuery(undefined, {
        enabled: hasSession,
        retry: false,
    });
    const { data: ocrHistoryPage, isLoading: isOcrHistoryLoading } = trpc.inventory.listOcrImportHistory.useQuery(ocrHistoryQueryInput, {
        enabled: hasSession,
        retry: false,
    });

    const addMutation = trpc.inventory.upsert.useMutation({
        onSuccess: () => {
            utils.inventory.list.invalidate();
            utils.inventory.summary.invalidate();
            setItemId('');
            setQuantity('');
        },
    });

    const removeMutation = trpc.inventory.delete.useMutation({
        onSuccess: () => {
            utils.inventory.list.invalidate();
            utils.inventory.summary.invalidate();
        },
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemId || !quantity) return;

        addMutation.mutate({
            itemId: parseInt(itemId),
            quantity: parseInt(quantity),
        });
    };

    const resetOcrHistoryPagination = () => setOcrHistoryCursorStack([undefined]);

    const handleOcrHistoryLimitChange = (value: number) => {
        setOcrHistoryLimit(value);
        resetOcrHistoryPagination();
    };

    const handleOcrHistorySearchChange = (value: string) => {
        setOcrHistorySearch(value);
        resetOcrHistoryPagination();
    };

    const handleOcrHistorySelectionSourceChange = (value: OcrHistorySelectionSourceFilter) => {
        setOcrHistorySelectionSource(value);
        resetOcrHistoryPagination();
    };

    const handleOcrHistoryNextPage = () => {
        if (!ocrHistoryPage?.nextCursor || isOcrHistoryLoading) {
            return;
        }

        setOcrHistoryCursorStack((current) => [...current, ocrHistoryPage.nextCursor]);
    };

    const handleOcrHistoryPreviousPage = () => {
        if (ocrHistoryCursorStack.length <= 1 || isOcrHistoryLoading) {
            return;
        }

        setOcrHistoryCursorStack((current) => current.slice(0, -1));
    };

    const handleClearOcrHistoryFilters = () => {
        setOcrHistorySearch('');
        setOcrHistorySelectionSource('all');
        resetOcrHistoryPagination();
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col gap-6">
                <div className="skeleton h-10 w-64 rounded-lg" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="skeleton h-80 rounded-xl" />
                    <div className="skeleton h-80 rounded-xl md:col-span-2" />
                </div>
            </div>
        );
    }

    if (!hasSession) {
        return (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
                <div>
                    <h1 className="text-2xl font-bold text-gold">Meu Inventário</h1>
                    <p className="mt-2 text-sm text-secondary">
                        O inventário agora usa sessão real. Faça login para consultar e editar seus itens com segurança.
                    </p>
                </div>

                <div className="card border border-gold/20 bg-gold/5 p-6">
                    <p className="text-sm text-secondary">
                        Sem autenticação, esta área não consulta mais `inventory.list` nem `inventory.summary`.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href="/login?callbackUrl=%2Finventory"
                            className="rounded-lg bg-gold px-4 py-2 font-semibold text-bg-primary"
                        >
                            Fazer login
                        </Link>
                        <Link
                            href="/"
                            className="rounded-lg border border-border px-4 py-2 font-semibold text-primary"
                        >
                            Voltar ao dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gold mb-1 flex items-center gap-2">
                        <Package size={24} />
                        Meu Inventário
                    </h1>
                    <p className="text-sm text-secondary">
                        Adicione os ingredientes e itens do seu armazém para calcular as oportunidades de lucro.
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-secondary">
                        Sessão ativa: {session?.user.username}
                    </p>
                </div>

                {/* KPI: Total Value */}
                <div className="bg-bg-hover border border-border px-4 py-2 rounded-lg text-right">
                    <p className="text-xs text-secondary mb-1">Valor Total (Market)</p>
                    <div className="font-mono font-bold text-lg text-gold">
                        {summaryData ? summaryData.totalValue.toLocaleString('pt-BR') : '0'} S
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setActiveSection('inventory')}
                    className={[
                        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        activeSection === 'inventory'
                            ? 'border-gold/40 bg-gold/10 text-gold'
                            : 'border-border bg-bg-hover/20 text-secondary hover:text-primary',
                    ].join(' ')}
                    aria-pressed={activeSection === 'inventory'}
                >
                    Inventário
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('ocr-history')}
                    className={[
                        'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        activeSection === 'ocr-history'
                            ? 'border-gold/40 bg-gold/10 text-gold'
                            : 'border-border bg-bg-hover/20 text-secondary hover:text-primary',
                    ].join(' ')}
                    aria-pressed={activeSection === 'ocr-history'}
                >
                    <History size={16} />
                    Histórico OCR
                    {ocrHistoryPage?.items && ocrHistoryPage.items.length > 0 ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-primary">
                            {ocrHistoryPage.items.length}
                        </span>
                    ) : null}
                </button>
            </div>

            {activeSection === 'inventory' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Formulário de Adição */}
                    <div className="md:col-span-1">
                        <div className="flex flex-col gap-6">
                            <div className="card p-6">
                                <h2 className="text-lg font-semibold mb-4 text-primary">Inserir Item</h2>
                                <form onSubmit={handleAdd} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">
                                            Item ID BDO
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gold"
                                            value={itemId}
                                            onChange={e => setItemId(e.target.value)}
                                            placeholder="Ex: 7001 (Trigo)"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">
                                            Quantidade
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gold"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            placeholder="Ex: 15000"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={addMutation.isPending}
                                        className="mt-2 w-full bg-gold/90 hover:bg-gold text-bg-primary font-bold rounded-md py-2 px-4 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {addMutation.isPending ? 'Salvando...' : (
                                            <>
                                                <Plus size={18} /> Adicionar ao Armazém
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                            <InventoryScreenshotImportPanel />
                        </div>
                    </div>

                    {/* Lista de Itens */}
                    <div className="md:col-span-2">
                        <div className="card h-full">
                            <div className="p-4 border-b border-border bg-bg-hover/30">
                                <h3 className="font-semibold text-primary">Itens Cadastrados</h3>
                            </div>

                            <div className="p-4">
                                {isLoading ? (
                                    <div className="flex flex-col gap-2">
                                        {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 w-full rounded" />)}
                                    </div>
                                ) : !inventory || inventory.length === 0 ? (
                                    <div className="text-center py-12 text-secondary">
                                        <Package size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>Seu inventário está vazio.</p>
                                        <p className="text-xs mt-1">Insira itens no formulário ao lado.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {inventory.map((entry: any) => (
                                            <div key={entry.itemId} className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-hover/20 hover:bg-bg-hover transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded bg-bg-primary border border-border flex items-center justify-center text-xs font-mono text-muted">
                                                        {entry.itemId}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-primary">{entry.item.name}</p>
                                                        <p className="text-xs text-secondary mt-0.5">
                                                            Valor unitário estimado: {entry.avgAcquisitionCost ? String(entry.avgAcquisitionCost) : '---'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="font-mono font-bold text-lg">{entry.quantity.toLocaleString('pt-BR')}</p>
                                                        <p className="text-[10px] text-muted uppercase tracking-wide">Qtd</p>
                                                    </div>

                                                    <button
                                                        onClick={() => removeMutation.mutate({ itemId: entry.itemId })}
                                                        className="p-2 text-muted hover:text-loss transition-colors rounded-md hover:bg-loss/10"
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-hover/15 p-4">
                        <div>
                            <h2 className="text-sm font-semibold text-primary">Histórico OCR</h2>
                            <p className="mt-1 text-xs text-secondary">
                                Audite os lotes mais recentes importados por screenshot com paginação e filtros básicos.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-secondary">
                                Mostrar
                                <select
                                    value={ocrHistoryLimit}
                                    onChange={(event) => handleOcrHistoryLimitChange(Number(event.target.value))}
                                    className="rounded-md border border-border bg-bg-primary px-2 py-1 text-sm text-primary focus:outline-none focus:border-gold"
                                >
                                    {OCR_HISTORY_LIMIT_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                lotes
                            </label>

                            <div className="flex items-center gap-2 text-xs text-secondary">
                                <button
                                    type="button"
                                    onClick={handleOcrHistoryPreviousPage}
                                    disabled={ocrHistoryCursorStack.length <= 1 || isOcrHistoryLoading}
                                    className="rounded-md border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <span>Página {ocrHistoryCursorStack.length}</span>
                                <button
                                    type="button"
                                    onClick={handleOcrHistoryNextPage}
                                    disabled={!ocrHistoryPage?.hasMore || isOcrHistoryLoading}
                                    className="rounded-md border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-bg-hover/10 p-4 md:grid-cols-[minmax(0,2fr)_220px]">
                        <label className="flex flex-col gap-2 text-xs text-secondary">
                            Buscar por nome OCR ou item final
                            <input
                                type="search"
                                value={ocrHistorySearch}
                                onChange={(event) => handleOcrHistorySearchChange(event.target.value)}
                                placeholder="Ex: açúcar"
                                className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            />
                        </label>

                        <label className="flex flex-col gap-2 text-xs text-secondary">
                            Origem da seleção
                            <select
                                value={ocrHistorySelectionSource}
                                onChange={(event) => handleOcrHistorySelectionSourceChange(event.target.value as OcrHistorySelectionSourceFilter)}
                                className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-primary focus:outline-none focus:border-gold"
                            >
                                <option value="all">Todas</option>
                                {Object.entries(SELECTION_SOURCE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {hasOcrHistoryFilters ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-hover/10 px-4 py-3 text-xs text-secondary">
                            <span>
                                Filtros ativos:
                                {ocrHistorySearch.trim() ? ` busca "${ocrHistorySearch.trim()}"` : ''}
                                {ocrHistorySelectionSource !== 'all'
                                    ? ` • origem ${SELECTION_SOURCE_LABELS[ocrHistorySelectionSource]}`
                                    : ''}
                            </span>
                            <button
                                type="button"
                                onClick={handleClearOcrHistoryFilters}
                                className="rounded-md border border-border px-3 py-1.5 text-primary transition-colors hover:border-gold/40 hover:text-gold"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    ) : null}

                    <InventoryOcrHistoryPanel
                        history={ocrHistoryPage?.items}
                        isLoading={isOcrHistoryLoading}
                        emptyTitle={hasOcrHistoryFilters
                            ? 'Nenhum lote encontrado para os filtros informados.'
                            : undefined}
                        emptyDescription={hasOcrHistoryFilters
                            ? 'Ajuste a busca, a origem da seleção ou limpe os filtros para visualizar outros lotes.'
                            : undefined}
                    />
                </div>
            )}
        </div>
    );
}

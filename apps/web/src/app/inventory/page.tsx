'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc';
import { Package, Plus, Trash2, Import } from 'lucide-react';

export default function InventoryPage() {
    const [itemId, setItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const { data: session, status } = useSession();
    const hasSession = status === 'authenticated';

    const utils = trpc.useUtils();
    const { data: inventory, isLoading } = trpc.inventory.list.useQuery(undefined, {
        enabled: hasSession,
        retry: false,
    });
    const { data: summaryData } = trpc.inventory.summary.useQuery(undefined, {
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulário de Adição */}
                <div className="md:col-span-1">
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

                        <div className="mt-6 pt-6 border-t border-border">
                            <button className="w-full bg-bg-hover border border-border hover:border-gold/50 text-secondary hover:text-primary rounded-md py-2 px-4 transition-colors flex items-center justify-center gap-2 text-sm">
                                <Import size={16} /> Importar CSV
                            </button>
                        </div>
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
                                                {/* Ícone Placeholer (na realidade viria da bdolytics CDN) */}
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
        </div>
    );
}

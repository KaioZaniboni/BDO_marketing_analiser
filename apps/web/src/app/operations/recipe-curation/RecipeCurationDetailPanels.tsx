import { Files, GitBranch } from 'lucide-react';
import Link from 'next/link';
import type { RecipeCurationPageData } from '@/server/recipe-curation';
import { RecipeCurationDraftEditor } from './RecipeCurationDraftEditor';

interface RecipeCurationDetailPanelsProps {
    data: RecipeCurationPageData;
    optionUsage: Map<number, string[]>;
}

function formatSourceLabel(source: RecipeCurationPageData['currentCurationSource']) {
    if (source === 'db') return 'DB';
    if (source === 'json') return 'JSON';
    return 'Seed';
}

export function RecipeCurationDetailPanels({ data, optionUsage }: RecipeCurationDetailPanelsProps) {
    if (data.loadError || !data.selectedCraft) {
        return null;
    }

    return (
        <>
            <div className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-primary">{data.selectedCraft.name}</h2>
                            <span className="grade-badge grade-white uppercase text-[10px]">{data.selectedCraft.type}</span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${data.currentCuration ? 'bg-profit/15 text-profit' : 'bg-bg-hover text-secondary'}`}>
                                {data.currentCuration ? `Ativo via ${formatSourceLabel(data.currentCurationSource)}` : 'Sem curadoria'}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-secondary">Resultado principal: {data.selectedCraft.resultQuantity}x {data.selectedCraft.resultItem.name}</p>
                        <p className="mt-1 font-mono text-xs text-secondary">{data.selectedCraft.canonicalKey}</p>
                    </div>
                    <div className="text-right text-xs text-secondary">
                        <p>Slots: {data.selectedCraft.slots.length}</p>
                        <p>Variantes: {data.selectedCraft.variants.length}</p>
                        <p>Origem materializada: {data.selectedCraft.source}</p>
                    </div>
                </div>
            </div>

            <div className="card p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary">
                    <GitBranch size={18} className="text-info" /> Variantes legadas
                </h3>
                <div className="space-y-3">
                    {data.selectedCraft.variants.map((variant) => (
                        <div key={variant.id} className="rounded-lg border border-border bg-bg-hover/20 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-primary">{variant.name}</p>
                                    <p className="mt-1 text-xs text-secondary">Legacy ID: {variant.legacyRecipeId ?? 'sem vínculo'} • variantKey: {variant.variantKey}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {variant.isPrimary && <span className="rounded-full bg-gold/15 px-2 py-1 text-[10px] font-semibold uppercase text-gold">Primária</span>}
                                    {variant.legacyRecipeId && <Link href={`/${variant.type}/${variant.legacyRecipeId}`} className="text-xs font-semibold text-gold hover:underline">Abrir detalhe</Link>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary">
                    <Files size={18} className="text-info" /> Slots e opções observadas
                </h3>
                <div className="space-y-4">
                    {data.selectedCraft.slots.map((slot) => (
                        <div key={slot.id} className="rounded-lg border border-border bg-bg-hover/20 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-primary">Slot {slot.sortOrder + 1}: {slot.label ?? slot.slotKey}</p>
                                    <p className="mt-1 text-xs text-secondary">slotKey: {slot.slotKey}</p>
                                </div>
                                <span className="text-xs text-secondary">{slot.options.length} opção(ões)</span>
                            </div>
                            <div className="mt-3 space-y-2">
                                {slot.options.map((option) => (
                                    <div key={option.id} className="rounded-md border border-border bg-bg-primary/40 p-3 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-primary">{option.quantity}x {option.item.name}</p>
                                                <p className="mt-1 text-xs text-secondary">itemId: {option.itemId}</p>
                                            </div>
                                            {option.isDefault && <span className="rounded-full bg-gold/15 px-2 py-1 text-[10px] font-semibold uppercase text-gold">Default atual</span>}
                                        </div>
                                        <p className="mt-2 text-xs text-secondary">Usado por: {(optionUsage.get(option.id) ?? []).join(', ') || 'nenhuma variante vinculada'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="card p-6"><h3 className="mb-3 text-lg font-semibold text-primary">Curadoria efetiva</h3><pre className="overflow-x-auto rounded-lg border border-border bg-bg-hover/20 p-4 text-xs text-secondary">{JSON.stringify(data.currentCuration ?? { status: 'sem entrada para este craft' }, null, 2)}</pre></div>
                <div className="card p-6"><h3 className="mb-3 text-lg font-semibold text-primary">Entrada DB</h3><pre className="overflow-x-auto rounded-lg border border-border bg-bg-hover/20 p-4 text-xs text-secondary">{JSON.stringify(data.dbCuration ?? { status: 'sem override no banco' }, null, 2)}</pre></div>
                <div className="card p-6"><h3 className="mb-3 text-lg font-semibold text-primary">Baseline JSON</h3><pre className="overflow-x-auto rounded-lg border border-border bg-bg-hover/20 p-4 text-xs text-secondary">{JSON.stringify(data.jsonCuration ?? { status: 'sem entrada no baseline' }, null, 2)}</pre></div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="card p-6">
                    <RecipeCurationDraftEditor key={data.selectedCraft.canonicalKey} selectedCanonicalKey={data.selectedCraft.canonicalKey} initialDraftJson={data.draftJson ?? ''} />
                </div>
                <div className="card p-6">
                    <h3 className="mb-3 text-lg font-semibold text-primary">Auditoria recente</h3>
                    <div className="space-y-3 text-sm text-secondary">
                        {data.recentAudits.length === 0 && <p>Nenhuma auditoria registrada para este craft no banco.</p>}
                        {data.recentAudits.map((audit) => (
                            <div key={audit.id} className="rounded-lg border border-border bg-bg-hover/20 p-3">
                                <p className="font-medium uppercase text-primary">{audit.action}</p>
                                <p className="mt-1 text-xs">Actor: {audit.actorUsername ?? 'sistema'}</p>
                                <p className="mt-1 text-xs">{audit.createdAt.toLocaleString('pt-BR')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
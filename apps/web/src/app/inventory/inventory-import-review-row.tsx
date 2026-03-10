'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { InventoryImportCandidateCard, InventoryImportSelectedItemSummary } from './inventory-import-review-candidate-card';
import { InventoryImportReviewCapturePanel } from './inventory-import-review-capture-panel';
import { InventoryImportReviewQuantityEditor } from './inventory-import-review-quantity-editor';
import {
    getInventoryImportSelectionMeta,
    prioritizeInventoryImportCandidates,
    type InventoryImportItemCandidate,
    type InventoryImportSelectionMeta,
    type InventoryImportPreviewRow,
} from './inventory-import-utils';

const MANUAL_SEARCH_LIMIT = 8;
const AUTO_SEARCH_DEBOUNCE_MS = 350;
const AUTO_SELECT_MANUAL_SCORE = 0.9;

const STATUS_STYLES: Record<InventoryImportPreviewRow['status'], string> = {
    matched: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    ambiguous: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    unmatched: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

const STATUS_LABELS: Record<InventoryImportPreviewRow['status'], string> = {
    matched: 'Match automático',
    ambiguous: 'Precisa revisar',
    unmatched: 'Sem sugestão',
};

const SELECTION_SOURCE_LABELS = {
    ocr: 'OCR',
    manual: 'Busca manual',
    auto: 'Auto',
} as const;

interface InventoryImportReviewRowProps {
    row: InventoryImportPreviewRow & { originalQuantity?: number };
    rowIndex?: number;
    selectedItemId: number | null;
    onSelectionChange: (value: string) => void;
    onQuantityChange: (value: number) => void;
    onSelectionMetaChange?: (meta: InventoryImportSelectionMeta | null) => void;
}

function mergeCandidates(
    baseCandidates: InventoryImportItemCandidate[],
    extraCandidates: InventoryImportItemCandidate[],
) {
    const uniqueCandidates = new Map<number, InventoryImportItemCandidate>();

    for (const candidate of [...baseCandidates, ...extraCandidates]) {
        if (!uniqueCandidates.has(candidate.id)) {
            uniqueCandidates.set(candidate.id, candidate);
        }
    }

    return Array.from(uniqueCandidates.values());
}

function getReviewPriority(
    row: InventoryImportPreviewRow & { originalQuantity?: number },
    selectedItemId: number | null,
) {
    const originalQuantity = row.originalQuantity ?? row.quantity;

    if (!selectedItemId || row.status === 'unmatched') {
        return {
            label: 'Decisão pendente',
            className: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
            description: 'Escolha ou confirme o item antes da importação.',
        };
    }

    if (row.status !== 'matched' || row.quantity !== originalQuantity) {
        return {
            label: 'Revisão final',
            className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
            description: 'Confira a captura e a quantidade antes de seguir.',
        };
    }

    return {
        label: 'Pronto para importar',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        description: 'Item com baixo risco visual nesta revisão.',
    };
}

export function InventoryImportReviewRow({
    row,
    rowIndex,
    selectedItemId,
    onSelectionChange,
    onQuantityChange,
    onSelectionMetaChange,
}: InventoryImportReviewRowProps) {
    const originalQuantity = row.originalQuantity ?? row.quantity;
    const [quantityInput, setQuantityInput] = useState(() => String(row.quantity));
    const [manualSearchTerm, setManualSearchTerm] = useState(row.rawName);
    const [hasInteractedWithSearch, setHasInteractedWithSearch] = useState(false);
    const [debouncedManualSearchTerm, setDebouncedManualSearchTerm] = useState('');
    const [autoSelectedItemId, setAutoSelectedItemId] = useState<number | null>(null);
    const [lastAutoSelectedKey, setLastAutoSelectedKey] = useState<string | null>(null);

    const trimmedManualSearchTerm = manualSearchTerm.trim();
    const shouldAutoSearch = hasInteractedWithSearch && debouncedManualSearchTerm.length >= 2;

    useEffect(() => {
        setQuantityInput(String(row.quantity));
    }, [row.quantity]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedManualSearchTerm(trimmedManualSearchTerm);
        }, AUTO_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [trimmedManualSearchTerm]);

    const searchItemsQuery = trpc.market.searchItems.useQuery(
        {
            query: shouldAutoSearch ? debouncedManualSearchTerm : 'ok',
            limit: MANUAL_SEARCH_LIMIT,
        },
        {
            enabled: shouldAutoSearch,
            retry: false,
        },
    );

    const manualCandidates = useMemo<InventoryImportItemCandidate[]>(() => {
        const nextCandidates = (searchItemsQuery.data ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            iconUrl: item.iconUrl,
            grade: item.grade,
            score: 0,
        }));

        return prioritizeInventoryImportCandidates(trimmedManualSearchTerm || row.rawName, nextCandidates);
    }, [row.rawName, searchItemsQuery.data, trimmedManualSearchTerm]);

    const availableCandidates = useMemo(
        () => mergeCandidates(row.candidates, manualCandidates),
        [manualCandidates, row.candidates],
    );
    const bestManualCandidate = manualCandidates[0] ?? null;
    const selectedCandidate = useMemo(
        () => availableCandidates.find((candidate) => candidate.id === selectedItemId) ?? null,
        [availableCandidates, selectedItemId],
    );

    useEffect(() => {
        if (!bestManualCandidate || selectedItemId != null || row.status === 'matched' || !shouldAutoSearch) {
            return;
        }

        if (bestManualCandidate.score < AUTO_SELECT_MANUAL_SCORE) {
            return;
        }

        const autoSelectedKey = `${debouncedManualSearchTerm}:${bestManualCandidate.id}`;
        if (lastAutoSelectedKey === autoSelectedKey) {
            return;
        }

        onSelectionChange(String(bestManualCandidate.id));
        setAutoSelectedItemId(bestManualCandidate.id);
        setLastAutoSelectedKey(autoSelectedKey);
    }, [
        bestManualCandidate,
        debouncedManualSearchTerm,
        lastAutoSelectedKey,
        onSelectionChange,
        row.status,
        selectedItemId,
        shouldAutoSearch,
    ]);

    const selectionMeta = useMemo(
        () => getInventoryImportSelectionMeta(row, selectedItemId, manualCandidates, autoSelectedItemId),
        [autoSelectedItemId, manualCandidates, row, selectedItemId],
    );
    const isAutoSelected = selectionMeta?.selectionSource === 'auto';
    const selectionReason = useMemo(() => {
        if (!selectionMeta) {
            return null;
        }

        if (selectionMeta.selectionSource === 'auto') {
            return autoSelectedItemId === selectedItemId
                ? 'Melhor candidato da busca por nome aplicado automaticamente.'
                : row.recognitionMode === 'icon'
                ? 'Melhor candidato visual pré-selecionado automaticamente para acelerar a revisão.'
                : 'Melhor candidato aplicado automaticamente.';
        }

        if (selectionMeta.selectionSource === 'manual') {
            return 'Item escolhido manualmente a partir da busca por nome.';
        }

        if (row.status === 'matched' && row.matchedItemId === selectedItemId) {
            return row.recognitionMode === 'icon'
                ? 'Match automático por ícone.'
                : 'Match automático do OCR.';
        }

        return row.recognitionMode === 'icon'
            ? 'Candidato sugerido pelo reconhecimento visual confirmado na revisão.'
            : 'Candidato sugerido pelo OCR confirmado na revisão.';
    }, [autoSelectedItemId, row.matchedItemId, row.recognitionMode, row.status, selectedItemId, selectionMeta]);

    useEffect(() => {
        onSelectionMetaChange?.(selectionMeta);
    }, [onSelectionMetaChange, selectionMeta]);

    const searchFeedback = useMemo(() => {
        if (!hasInteractedWithSearch) {
            return 'A busca começa automaticamente após uma pequena pausa na digitação.';
        }

        if (!trimmedManualSearchTerm) {
            return 'Use o nome do item para buscar opções adicionais.';
        }

        if (trimmedManualSearchTerm.length < 2) {
            return 'Digite pelo menos 2 letras para buscar um item.';
        }

        if (searchItemsQuery.isFetching) {
            return 'Buscando opções por nome...';
        }

        if (searchItemsQuery.error) {
            return searchItemsQuery.error.message || 'Não foi possível buscar itens agora.';
        }

        if (searchItemsQuery.data && searchItemsQuery.data.length === 0) {
            return 'Nenhum item encontrado com esse nome.';
        }

        if (searchItemsQuery.data && searchItemsQuery.data.length > 0) {
            if (selectedItemId && bestManualCandidate?.id === selectedItemId && bestManualCandidate.score >= AUTO_SELECT_MANUAL_SCORE) {
                return `Melhor candidato manual aplicado automaticamente: ${bestManualCandidate.name} (score ${bestManualCandidate.score.toFixed(2)}).`;
            }

            return `${searchItemsQuery.data.length} opção(ões) encontrada(s) automaticamente.`;
        }

        return 'Refine o nome para atualizar as opções.';
    }, [
        bestManualCandidate,
        hasInteractedWithSearch,
        searchItemsQuery.data,
        searchItemsQuery.error,
        searchItemsQuery.isFetching,
        selectedItemId,
        trimmedManualSearchTerm,
    ]);

    function handleQuantityInputChange(value: string) {
        const nextValue = value.replace(/[^0-9]/g, '');
        setQuantityInput(nextValue);

        if (!nextValue) {
            return;
        }

        const nextQuantity = Number.parseInt(nextValue, 10);
        if (Number.isSafeInteger(nextQuantity) && nextQuantity > 0) {
            onQuantityChange(nextQuantity);
        }
    }

    function handleQuantityBlur() {
        if (!quantityInput) {
            setQuantityInput(String(row.quantity));
            return;
        }

        const nextQuantity = Number.parseInt(quantityInput, 10);
        if (!Number.isSafeInteger(nextQuantity) || nextQuantity <= 0) {
            setQuantityInput(String(row.quantity));
            return;
        }

        setQuantityInput(String(nextQuantity));
        if (nextQuantity !== row.quantity) {
            onQuantityChange(nextQuantity);
        }
    }

    function handleManualSelectionChange(value: string) {
        setAutoSelectedItemId(null);
        onSelectionChange(value);
    }

    const candidateSectionTitle = row.recognitionMode === 'icon' ? 'Candidatos visuais' : 'Candidatos sugeridos';
    const rowLabel = rowIndex != null ? `Item ${String(rowIndex + 1).padStart(2, '0')}` : 'Item em revisão';
    const reviewLead = row.recognitionMode === 'icon'
        ? 'Use a captura do slot como referência principal. O nome detectado ajuda, mas a confirmação final deve vir da comparação visual.'
        : 'Use o recorte da linha OCR como referência principal. O nome lido serve como apoio, não como única fonte de decisão.';
    const reviewPriority = getReviewPriority(row, selectedItemId);

    return (
        <div className={[
            'rounded-2xl border p-4 transition-colors md:p-5',
            isAutoSelected
                ? 'border-gold/40 bg-gold/10'
                : 'border-border bg-bg-hover/10',
        ].join(' ')}>
            <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border bg-bg-primary/40 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_280px] xl:items-start">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-secondary">
                                    {rowLabel}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${STATUS_STYLES[row.status]}`}>
                                    {STATUS_LABELS[row.status]}
                                </span>
                                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-secondary">
                                    {row.recognitionMode === 'icon' ? 'V2 por ícone' : 'V1 por OCR'}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${reviewPriority.className}`}>
                                    {reviewPriority.label}
                                </span>
                                {isAutoSelected ? (
                                    <span className="rounded-full border border-gold/30 bg-gold/15 px-2.5 py-1 text-[10px] uppercase tracking-wide text-gold">
                                        Selecionado automaticamente
                                    </span>
                                ) : null}
                            </div>

                            <p className="mt-3 text-lg font-semibold text-primary">{selectedCandidate?.name ?? row.rawName}</p>
                            <p className="mt-2 max-w-4xl text-sm text-secondary">{reviewLead}</p>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-lg border border-border bg-bg-hover/20 p-3">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">Nome detectado</p>
                                    <p className="mt-2 text-sm font-semibold text-primary">{row.rawName}</p>
                                </div>

                                <div className="rounded-lg border border-border bg-bg-hover/20 p-3">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">Quantidade atual</p>
                                    <p className="mt-2 text-sm font-semibold text-primary">{row.quantity.toLocaleString('pt-BR')}</p>
                                </div>

                                <div className="rounded-lg border border-border bg-bg-hover/20 p-3">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">Item confirmado</p>
                                    <p className="mt-2 text-sm font-semibold text-primary">{selectedCandidate?.name ?? 'Pendente de confirmação'}</p>
                                </div>
                            </div>
                        </div>

                        <aside className={`rounded-xl border p-4 ${reviewPriority.className}`}>
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em]">Ação recomendada</p>
                            <p className="mt-2 text-sm font-semibold">{reviewPriority.label}</p>
                            <p className="mt-2 text-xs text-current/90">{reviewPriority.description}</p>
                        </aside>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <InventoryImportReviewCapturePanel
                        row={row}
                        selectedCandidate={selectedCandidate}
                        isAutoSelected={isAutoSelected}
                    />

                    <div className="space-y-4">
                        <InventoryImportReviewQuantityEditor
                            originalQuantity={originalQuantity}
                            confirmedQuantity={row.quantity}
                            quantityInput={quantityInput}
                            onQuantityChange={handleQuantityInputChange}
                            onQuantityBlur={handleQuantityBlur}
                        />

                        {selectionMeta ? (
                            <section className={[
                                'rounded-xl border p-4',
                                isAutoSelected
                                    ? 'border-gold/30 bg-gold/10'
                                    : 'border-border bg-bg-primary/30',
                            ].join(' ')}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-secondary">Metadados da seleção</p>
                                        <p className="mt-1 text-xs text-secondary">Veja por que este item foi sugerido ou confirmado.</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="rounded-full border border-border px-2 py-0.5 uppercase tracking-wide text-secondary">
                                            Origem da seleção: {SELECTION_SOURCE_LABELS[selectionMeta.selectionSource]}
                                        </span>
                                        <span className="rounded-full border border-border px-2 py-0.5 uppercase tracking-wide text-secondary">
                                            Score {selectionMeta.score.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {selectionReason ? <p className="mt-3 text-sm text-primary">{selectionReason}</p> : null}
                            </section>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <section className="rounded-xl border border-border bg-bg-primary/30 p-4">
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-secondary">Item confirmado</p>
                            <p className="mt-1 text-xs text-secondary">Escolha qual item será importado para esta linha.</p>
                        </div>

                        <select
                            value={selectedItemId ?? ''}
                            onChange={(event) => handleManualSelectionChange(event.target.value)}
                            className="mt-3 w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-primary focus:border-gold focus:outline-none"
                            disabled={availableCandidates.length === 0}
                        >
                            <option value="">Selecionar item</option>
                            {availableCandidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    {candidate.name} (ID {candidate.id})
                                </option>
                            ))}
                        </select>

                        {availableCandidates.length === 0 ? (
                            <p className="mt-3 text-xs text-secondary">
                                Sem sugestão automática. Use a busca manual abaixo para completar este item.
                            </p>
                        ) : null}

                        {selectedCandidate ? <InventoryImportSelectedItemSummary candidate={selectedCandidate} /> : null}
                    </section>

                    <section className="rounded-xl border border-border bg-bg-primary/30 p-4">
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-secondary">Busca manual</p>
                            <p className="mt-1 text-xs text-secondary">Digite pelo menos 2 letras para buscar itens adicionais sem sair da revisão.</p>
                        </div>

                        <input
                            type="text"
                            value={manualSearchTerm}
                            onFocus={() => setHasInteractedWithSearch(true)}
                            onChange={(event) => {
                                setHasInteractedWithSearch(true);
                                setManualSearchTerm(event.target.value);
                            }}
                            placeholder="Ex: Açúcar"
                            className="mt-3 w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-primary focus:border-gold focus:outline-none"
                        />

                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-bg-hover/15 p-3 text-xs text-secondary">
                            {searchItemsQuery.isFetching ? <Loader2 size={14} className="mt-0.5 animate-spin" /> : null}
                            <div>
                                <p>Digite pelo menos 2 letras. A busca roda automaticamente após uma pequena pausa.</p>
                                <p className="mt-1">{searchFeedback}</p>
                            </div>
                        </div>
                    </section>
                </div>

                {availableCandidates.length > 0 ? (
                    <section className="rounded-xl border border-border bg-bg-primary/30 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-secondary">{candidateSectionTitle}</p>
                                <p className="mt-1 text-xs text-secondary">Revise os candidatos sugeridos e clique no mais apropriado.</p>
                            </div>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                                {availableCandidates.length} opção(ões)
                            </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {availableCandidates.map((candidate) => {
                                const isSelected = candidate.id === selectedItemId;
                                const isManualCandidate = manualCandidates.some((manualCandidate) => manualCandidate.id === candidate.id);

                                return (
                                    <InventoryImportCandidateCard
                                        key={candidate.id}
                                        candidate={candidate}
                                        isSelected={isSelected}
                                        sourceLabel={candidate.id === autoSelectedItemId ? 'Auto' : isManualCandidate ? 'Busca' : row.recognitionMode === 'icon' ? 'Ícone' : 'OCR'}
                                        onSelect={() => handleManualSelectionChange(String(candidate.id))}
                                    />
                                );
                            })}
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    );
}
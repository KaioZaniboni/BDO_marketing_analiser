'use client';

import { InventoryImportItemThumbnail } from './inventory-import-review-candidate-card';
import type { InventoryImportItemCandidate, InventoryImportPreviewRow } from './inventory-import-utils';

interface InventoryImportReviewCapturePanelProps {
    row: InventoryImportPreviewRow & { originalQuantity?: number };
    selectedCandidate: InventoryImportItemCandidate | null;
    isAutoSelected: boolean;
}

function getActionHint(
    row: InventoryImportPreviewRow & { originalQuantity?: number },
    selectedCandidate: InventoryImportItemCandidate | null,
    isAutoSelected: boolean,
) {
    if (!selectedCandidate) {
        return 'Sem item confirmado ainda. Escolha um candidato visual ou use a busca manual abaixo.';
    }

    if (row.status === 'unmatched') {
        return 'O sistema não encontrou um match forte. Compare a captura com o item escolhido antes de importar.';
    }

    if (row.quantity !== (row.originalQuantity ?? row.quantity)) {
        return 'A quantidade já foi ajustada. Faça a conferência final entre o recorte da captura e o valor confirmado.';
    }

    return isAutoSelected
        ? 'Item pré-selecionado automaticamente. Faça uma checagem visual rápida antes de confirmar.'
        : 'Confira se a captura original bate com o item e a quantidade mostrados ao lado.';
}

export function InventoryImportReviewCapturePanel({
    row,
    selectedCandidate,
    isAutoSelected,
}: InventoryImportReviewCapturePanelProps) {
    const originalQuantity = row.originalQuantity ?? row.quantity;
    const evidenceTitle = row.captureEvidence?.mode === 'icon-slot' ? 'Captura do slot detectado' : 'Captura da linha OCR';

    return (
        <section className="rounded-xl border border-border bg-bg-primary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-secondary">Comparação visual</p>
                    <p className="mt-1 text-xs text-secondary">Use a imagem captada como fonte principal para validar o item e a quantidade.</p>
                </div>
                {row.captureEvidence?.sourceLabel ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                        {row.captureEvidence.sourceLabel}
                    </span>
                ) : null}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-bg-hover/15 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">{evidenceTitle}</p>
                    <div className="mt-3 flex min-h-[124px] items-center justify-center rounded-xl border border-dashed border-border bg-bg-primary/50 p-3">
                        {row.captureEvidence?.imageUrl ? (
                            <img src={row.captureEvidence.imageUrl} alt={evidenceTitle} className="max-h-32 w-auto max-w-full rounded-lg object-contain" />
                        ) : (
                            <p className="text-center text-xs text-secondary">A captura visual desta linha não ficou disponível. Use o restante das pistas para revisar.</p>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                        <div className="rounded-lg border border-border bg-bg-primary/60 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-secondary">Nome lido</p>
                            <p className="mt-1 text-sm font-semibold text-primary">{row.rawName}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-bg-primary/60 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-secondary">Quantidade lida</p>
                            <p className="mt-1 text-sm font-semibold text-primary">{originalQuantity.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {row.captureEvidence?.quantityImageUrl ? (
                        <div className="mt-3 rounded-lg border border-border bg-bg-primary/60 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-secondary">Recorte da quantidade</p>
                            <div className="mt-2 flex items-center justify-center rounded-lg border border-dashed border-border bg-white/90 p-2">
                                <img src={row.captureEvidence.quantityImageUrl} alt="Recorte da quantidade captada" className="max-h-16 w-auto max-w-full object-contain" />
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="rounded-xl border border-border bg-bg-hover/15 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">Item atualmente selecionado</p>
                    <div className="mt-3 flex min-h-[124px] items-center justify-center rounded-xl border border-dashed border-border bg-bg-primary/50 p-4">
                        {selectedCandidate ? (
                            <div className="flex w-full items-center gap-4">
                                <InventoryImportItemThumbnail candidate={selectedCandidate} sizeClassName="h-16 w-16" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-primary">{selectedCandidate.name}</p>
                                    <p className="mt-1 text-xs text-secondary">ID {selectedCandidate.id} · score {selectedCandidate.score.toFixed(2)}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-xs text-secondary">Nenhum item confirmado ainda. Escolha um candidato para concluir esta linha.</p>
                        )}
                    </div>

                    <div className="mt-4 rounded-lg border border-gold/20 bg-gold/5 p-3">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">O que revisar agora</p>
                        <p className="mt-2 text-sm text-primary">{getActionHint(row, selectedCandidate, isAutoSelected)}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
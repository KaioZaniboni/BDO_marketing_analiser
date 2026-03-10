'use client';

import { resolveBdoIconUrl } from '@/lib/icon-url';
import type { InventoryImportItemCandidate } from './inventory-import-utils';

const ITEM_GRADE_META: Record<number, { label: string; className: string }> = {
    0: { label: 'Branco', className: 'grade-white' },
    1: { label: 'Verde', className: 'grade-green' },
    2: { label: 'Azul', className: 'grade-blue' },
    3: { label: 'Amarelo', className: 'grade-yellow' },
    4: { label: 'Laranja', className: 'grade-orange' },
};

function getItemGradeMeta(grade: number) {
    return ITEM_GRADE_META[grade] ?? ITEM_GRADE_META[0];
}

export function InventoryImportItemThumbnail({
    candidate,
    sizeClassName = 'h-10 w-10',
}: {
    candidate: InventoryImportItemCandidate;
    sizeClassName?: string;
}) {
    const iconUrl = resolveBdoIconUrl(candidate.iconUrl);
    const containerClassName = `${sizeClassName} rounded-lg border border-border bg-bg-primary object-cover`;

    return iconUrl ? (
        <img src={iconUrl} alt={candidate.name} className={containerClassName} />
    ) : (
        <div className={`flex ${sizeClassName} items-center justify-center rounded-lg border border-border bg-bg-primary text-[11px] text-muted`}>
            {candidate.id}
        </div>
    );
}

export function InventoryImportSelectedItemSummary({ candidate }: { candidate: InventoryImportItemCandidate }) {
    const gradeMeta = getItemGradeMeta(candidate.grade);

    return (
        <div className="mt-3 rounded-xl border border-gold/20 bg-gold/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">Item selecionado</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                    ID {candidate.id}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <InventoryImportItemThumbnail candidate={candidate} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">{candidate.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${gradeMeta.className}`}>
                            {gradeMeta.label}
                        </span>
                        <span className="text-[11px] text-secondary">Pronto para confirmar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface InventoryImportCandidateCardProps {
    candidate: InventoryImportItemCandidate;
    isSelected: boolean;
    sourceLabel: string;
    onSelect: () => void;
}

export function InventoryImportCandidateCard({
    candidate,
    isSelected,
    sourceLabel,
    onSelect,
}: InventoryImportCandidateCardProps) {
    const gradeMeta = getItemGradeMeta(candidate.grade);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={[
                'w-full rounded-xl border p-3 text-left transition-colors',
                isSelected
                    ? 'border-gold/40 bg-gold/10 shadow-[0_0_0_1px_rgba(201,165,92,0.12)]'
                    : 'border-border bg-bg-hover/15 hover:border-gold/30 hover:bg-bg-hover/25',
            ].join(' ')}
        >
            <div className="flex items-start gap-3">
                <InventoryImportItemThumbnail candidate={candidate} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-primary">{candidate.name}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                            {sourceLabel}
                        </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-secondary">ID {candidate.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${gradeMeta.className}`}>
                            {gradeMeta.label}
                        </span>
                        {candidate.score > 0 ? (
                            <span className="text-[11px] text-secondary">Score {candidate.score.toFixed(2)}</span>
                        ) : null}
                    </div>
                    {isSelected ? (
                        <p className="mt-2 text-xs text-gold">Selecionado para importação.</p>
                    ) : (
                        <p className="mt-2 text-xs text-secondary">Clique para confirmar este candidato.</p>
                    )}
                </div>
            </div>
        </button>
    );
}
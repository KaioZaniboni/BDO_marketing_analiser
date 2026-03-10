'use client';

interface InventoryImportReviewQuantityEditorProps {
    originalQuantity: number;
    confirmedQuantity: number;
    quantityInput: string;
    onQuantityChange: (value: string) => void;
    onQuantityBlur: () => void;
}

export function InventoryImportReviewQuantityEditor({
    originalQuantity,
    confirmedQuantity,
    quantityInput,
    onQuantityChange,
    onQuantityBlur,
}: InventoryImportReviewQuantityEditorProps) {
    const wasAdjusted = confirmedQuantity !== originalQuantity;

    return (
        <div className="rounded-xl border border-border bg-bg-hover/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">
                        Quantidade confirmada
                    </label>
                    <p className="mt-1 text-xs text-secondary">
                        Revise a leitura original e ajuste somente se necessário.
                    </p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${wasAdjusted ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
                    {wasAdjusted ? 'Ajustada' : 'Sem ajuste'}
                </span>
            </div>

            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-bg-primary/60 p-3">
                    <p className="text-secondary">OCR original</p>
                    <p className="mt-1 font-semibold text-primary">{originalQuantity.toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary/60 p-3">
                    <p className="text-secondary">Confirmada</p>
                    <p className="mt-1 font-semibold text-primary">{confirmedQuantity.toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <div className="mt-4">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">
                    Editar quantidade
                </label>
                <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={quantityInput}
                    onChange={(event) => onQuantityChange(event.target.value)}
                    onBlur={onQuantityBlur}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-right font-mono text-sm text-primary focus:border-gold focus:outline-none"
                />
            </div>
        </div>
    );
}
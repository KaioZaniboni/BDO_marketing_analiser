import { resolveBdoIconUrl } from '@/lib/icon-url';

type InventoryOcrHistoryBatch = {
    id: number;
    ocrTexts: string[];
    importedRowCount: number;
    importedQuantityTotal: number;
    createdAt: Date | string;
    importedItems: Array<{
        id: number;
        rawName: string;
        originalQuantity: number;
        confirmedQuantity: number;
        score: number;
        selectionSource: string;
        selectedItem: {
            id: number;
            name: string;
            iconUrl: string | null;
        };
    }>;
};

interface InventoryOcrHistoryPanelProps {
    history: InventoryOcrHistoryBatch[] | undefined;
    isLoading: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
}

export const SELECTION_SOURCE_LABELS: Record<string, string> = {
    ocr: 'OCR',
    manual: 'Busca manual',
    auto: 'Auto',
};

function formatImportDate(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Data indisponível'
        : date.toLocaleString('pt-BR');
}

function InventoryOcrHistoryItemCard({
    item,
}: {
    item: InventoryOcrHistoryBatch['importedItems'][number];
}) {
    const iconUrl = resolveBdoIconUrl(item.selectedItem.iconUrl);

    return (
        <div className="rounded-lg border border-border bg-bg-hover/20 p-3">
            <div className="flex items-start gap-3">
                {iconUrl ? (
                    <img src={iconUrl} alt={item.selectedItem.name} className="h-10 w-10 rounded-lg border border-border bg-bg-primary object-cover" />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-primary text-[11px] text-muted">
                        {item.selectedItem.id}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-primary">{item.selectedItem.name}</p>
                        <span className="text-[11px] text-secondary">ID {item.selectedItem.id}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary">OCR original: {item.rawName}</p>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-secondary sm:grid-cols-3">
                <span>Qtd OCR: <strong className="text-primary">{item.originalQuantity.toLocaleString('pt-BR')}</strong></span>
                <span>Qtd importada: <strong className="text-primary">{item.confirmedQuantity.toLocaleString('pt-BR')}</strong></span>
                <span>Score: <strong className="text-primary">{item.score.toFixed(2)}</strong></span>
            </div>

            <p className="mt-2 text-xs text-secondary">
                Origem da seleção: <strong className="text-primary">{SELECTION_SOURCE_LABELS[item.selectionSource] ?? item.selectionSource}</strong>
            </p>
        </div>
    );
}

export function InventoryOcrHistoryPanel({
    history,
    isLoading,
    emptyTitle = 'Nenhuma importação OCR registrada.',
    emptyDescription = 'Quando você concluir uma importação por screenshot, o lote aparecerá aqui para auditoria.',
}: InventoryOcrHistoryPanelProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((index) => <div key={index} className="skeleton h-36 w-full rounded-xl" />)}
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div className="card p-6 text-center text-secondary">
                <p className="text-sm font-medium text-primary">{emptyTitle}</p>
                <p className="mt-2 text-xs">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {history.map((batch) => (
                <details key={batch.id} className="card overflow-hidden">
                    <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                        <div className="border-b border-border bg-bg-hover/30 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-primary">Lote OCR #{batch.id}</h2>
                                    <p className="mt-1 text-xs text-secondary">Importado em {formatImportDate(batch.createdAt)}</p>
                                    <p className="mt-2 text-xs text-secondary">
                                        Clique para expandir detalhes do lote e auditar os itens importados.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-right text-xs text-secondary sm:min-w-56">
                                    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                                        <p>Linhas importadas</p>
                                        <p className="mt-1 font-mono text-sm font-semibold text-primary">{batch.importedRowCount.toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                                        <p>Quantidade total</p>
                                        <p className="mt-1 font-mono text-sm font-semibold text-primary">{batch.importedQuantityTotal.toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </summary>

                    <div className="space-y-4 p-4">
                        <details className="rounded-lg border border-border bg-bg-hover/15 p-3">
                            <summary className="cursor-pointer text-sm font-medium text-primary">
                                Texto bruto OCR ({batch.ocrTexts.length} captura(s))
                            </summary>
                            <div className="mt-3 space-y-3">
                                {batch.ocrTexts.map((ocrText, index) => (
                                    <pre key={`${batch.id}-${index}`} className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-bg-primary p-3 text-xs text-secondary">
                                        {ocrText}
                                    </pre>
                                ))}
                            </div>
                        </details>

                        <div className="space-y-3">
                            {batch.importedItems.map((item) => <InventoryOcrHistoryItemCard key={item.id} item={item} />)}
                        </div>
                    </div>
                </details>
            ))}
        </div>
    );
}
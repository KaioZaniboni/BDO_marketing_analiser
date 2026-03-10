'use client';

import { useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    ImagePlus,
    Loader2,
    ScanSearch,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
    analyzeInventoryScreenshotByIcon,
    buildInventoryCatalogFingerprints,
    type InventoryCatalogFingerprintItem,
    type InventoryImportCatalogItem,
} from './inventory-icon-import-utils';
import {
    buildDefaultSelectedItemIds,
    buildInventoryScreenshotImportItems,
    countResolvedInventoryImportRows,
    mergeInventoryImportEntries,
    parseInventoryOcrText,
    type InventoryImportPreviewRow,
    type InventoryImportSelectionMeta,
} from './inventory-import-utils';
import {
    buildInventoryDetectedOcrEntryEvidence,
    recognizeInventoryImageDetailed,
    type InventoryDetectedOcrEntryEvidence,
} from './inventory-screenshot-evidence-utils';
import { InventoryImportReviewRow } from './inventory-import-review-row';

type TesseractModule = typeof import('tesseract.js');
type InventoryRecognitionMode = 'text' | 'icon';

type PreviewImportRow = Awaited<ReturnType<ReturnType<typeof trpc.inventory.previewImport.useMutation>['mutateAsync']>>[number];
type PreviewLikeImportRow = PreviewImportRow & Partial<Pick<InventoryImportPreviewRow, 'recognitionMode' | 'detectedIconUrl' | 'captureEvidence'>>;
type EditablePreviewImportRow = InventoryImportPreviewRow & { originalQuantity: number };
type ReviewBucket = 'decision' | 'check' | 'ready';

const REVIEW_BUCKET_META: Record<ReviewBucket, {
    title: string;
    description: string;
    sectionClassName: string;
    badgeClassName: string;
}> = {
    decision: {
        title: 'Decisão pendente',
        description: 'Itens que ainda precisam de confirmação de item ou ficaram sem sugestão forte.',
        sectionClassName: 'border-rose-500/20 bg-rose-500/5',
        badgeClassName: 'border-rose-500/30 text-rose-200',
    },
    check: {
        title: 'Revisão final',
        description: 'Itens já encaminhados, mas que ainda merecem uma conferência visual antes da importação.',
        sectionClassName: 'border-amber-500/20 bg-amber-500/5',
        badgeClassName: 'border-amber-500/30 text-amber-200',
    },
    ready: {
        title: 'Prontos para importar',
        description: 'Itens com leitura e confirmação mais estáveis nesta rodada de revisão.',
        sectionClassName: 'border-emerald-500/20 bg-emerald-500/5',
        badgeClassName: 'border-emerald-500/30 text-emerald-200',
    },
};

function buildImportErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Não foi possível processar a importação por screenshot.';
}

async function recognizeInventoryImage(
    source: File | HTMLCanvasElement,
    onProgress: (progress: number, status: string) => void,
    options?: {
        language?: string;
        workerOptions?: Record<string, unknown>;
    },
): Promise<string> {
    const module = await import('tesseract.js') as TesseractModule & { default?: TesseractModule };
    const tesseract = module.default ?? module;
    const result = await tesseract.recognize(source, options?.language ?? 'por', {
        ...(options?.workerOptions ?? {}),
        logger: (message) => {
            if (typeof message.progress === 'number') {
                onProgress(message.progress, message.status);
            }
        },
    });

    return result.data.text ?? '';
}

function buildEditablePreviewRows(rows: Array<PreviewLikeImportRow & { originalQuantity?: number }>): EditablePreviewImportRow[] {
    return rows.map((row) => ({
        ...row,
        originalQuantity: row.originalQuantity ?? row.quantity,
    }));
}

export function getInventoryReviewBucket(
    row: Pick<EditablePreviewImportRow, 'status' | 'quantity' | 'originalQuantity'>,
    selectedItemId: number | null,
): ReviewBucket {
    const originalQuantity = row.originalQuantity ?? row.quantity;

    if (!selectedItemId || row.status === 'unmatched') {
        return 'decision';
    }

    if (row.status !== 'matched' || row.quantity !== originalQuantity) {
        return 'check';
    }

    return 'ready';
}

function buildTextPreviewRows(
    preview: PreviewImportRow[],
    evidenceEntries: InventoryDetectedOcrEntryEvidence[],
) {
    const evidenceByNormalizedName = new Map<string, InventoryDetectedOcrEntryEvidence[]>();

    for (const evidenceEntry of evidenceEntries) {
        const bucket = evidenceByNormalizedName.get(evidenceEntry.normalizedName) ?? [];
        bucket.push(evidenceEntry);
        evidenceByNormalizedName.set(evidenceEntry.normalizedName, bucket);
    }

    return buildEditablePreviewRows(preview.map((row) => {
        const matches = evidenceByNormalizedName.get(row.normalizedName) ?? [];
        const firstMatch = matches[0] ?? null;
        const captureEvidence = firstMatch?.captureEvidence
            ? {
                ...firstMatch.captureEvidence,
                sourceLabel: matches.length > 1
                    ? `${firstMatch.captureEvidence.sourceLabel ?? 'OCR consolidado'} +${matches.length - 1} leitura(s)`
                    : firstMatch.captureEvidence.sourceLabel ?? null,
            }
            : null;

        return {
            ...row,
            recognitionMode: 'text' as const,
            captureEvidence,
        };
    }));
}

export function InventoryScreenshotImportPanel() {
    const utils = trpc.useUtils();
    const previewMutation = trpc.inventory.previewImport.useMutation();
    const importMutation = trpc.inventory.importFromScreenshot.useMutation();
    const [recognitionMode, setRecognitionMode] = useState<InventoryRecognitionMode>('text');
    const catalogFingerprintCacheRef = useRef<Promise<InventoryCatalogFingerprintItem[]> | null>(null);
    const importCatalogQuery = trpc.inventory.listImportCatalog.useQuery(
        { limit: 2500 },
        {
            enabled: recognitionMode === 'icon',
            retry: false,
            staleTime: 5 * 60 * 1000,
        },
    );

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [ocrTexts, setOcrTexts] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<EditablePreviewImportRow[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Array<number | null>>([]);
    const [selectionMetadata, setSelectionMetadata] = useState<Array<InventoryImportSelectionMeta | null>>([]);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [importFeedback, setImportFeedback] = useState<string | null>(null);
    const [currentFileLabel, setCurrentFileLabel] = useState('');
    const [ocrProgressPct, setOcrProgressPct] = useState(0);
    const [isRecognizing, setIsRecognizing] = useState(false);

    const importItems = useMemo(
        () => buildInventoryScreenshotImportItems(previewRows, selectedItemIds, selectionMetadata),
        [previewRows, selectedItemIds, selectionMetadata],
    );
    const resolvedRows = useMemo(
        () => countResolvedInventoryImportRows(previewRows, selectedItemIds),
        [previewRows, selectedItemIds],
    );
    const unresolvedRows = previewRows.length - resolvedRows;
    const reviewGroups = useMemo(() => {
        const groups: Record<ReviewBucket, Array<{ row: EditablePreviewImportRow; index: number }>> = {
            decision: [],
            check: [],
            ready: [],
        };

        previewRows.forEach((row, index) => {
            const bucket = getInventoryReviewBucket(row, selectedItemIds[index] ?? null);
            groups[bucket].push({ row, index });
        });

        return groups;
    }, [previewRows, selectedItemIds]);

    function resetImportState() {
        setOcrTexts([]);
        setPreviewRows([]);
        setSelectedItemIds([]);
        setSelectionMetadata([]);
        setCurrentFileLabel('');
        setOcrProgressPct(0);
    }

    function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSelectedFiles(Array.from(event.target.files ?? []));
        setOcrError(null);
        setImportFeedback(null);
        resetImportState();
    }

    function handleModeChange(nextMode: InventoryRecognitionMode) {
        setRecognitionMode(nextMode);
        setSelectedFiles([]);
        setOcrError(null);
        setImportFeedback(null);
        resetImportState();
    }

    async function ensureCatalogFingerprints() {
        const queryData = importCatalogQuery.data ?? (await importCatalogQuery.refetch()).data;
        const catalogItems = (queryData ?? []) as InventoryImportCatalogItem[];
        if (catalogItems.length === 0) {
            throw new Error('O catálogo visual da V2 não está disponível agora. Tente novamente em instantes.');
        }

        if (!catalogFingerprintCacheRef.current) {
            catalogFingerprintCacheRef.current = buildInventoryCatalogFingerprints(catalogItems, (progress) => {
                setCurrentFileLabel(`Preparando catálogo visual (${Math.round(progress * 100)}%)`);
                setOcrProgressPct(Math.round(progress * 100));
            });
        }

        return catalogFingerprintCacheRef.current;
    }

    async function processTextScreenshots() {
        const extractedTexts: string[] = [];
        const parsedEntries = [] as Array<{ rawName: string; quantity: number }>;
        const evidenceEntries: InventoryDetectedOcrEntryEvidence[] = [];

        for (const [index, file] of selectedFiles.entries()) {
            setCurrentFileLabel(`Lendo ${file.name} (${index + 1}/${selectedFiles.length})`);

            const recognized = await recognizeInventoryImageDetailed(file, (fileProgress) => {
                const aggregateProgress = ((index + fileProgress) / selectedFiles.length) * 100;
                setOcrProgressPct(Math.round(aggregateProgress));
            });

            extractedTexts.push(recognized.text);
            parsedEntries.push(...parseInventoryOcrText(recognized.text));
            evidenceEntries.push(...await buildInventoryDetectedOcrEntryEvidence(file, recognized));
            setOcrProgressPct(Math.round(((index + 1) / selectedFiles.length) * 100));
        }

        if (parsedEntries.length === 0) {
            throw new Error('O OCR terminou, mas não encontrei linhas com padrão de nome + quantidade.');
        }

        const mergedEntries = mergeInventoryImportEntries(parsedEntries);
        const preview = await previewMutation.mutateAsync({ entries: mergedEntries });
        return {
            extractedTexts,
            rows: buildTextPreviewRows(preview, evidenceEntries),
        };
    }

    async function processIconScreenshots() {
        const extractedTexts: string[] = [];
        const rows: EditablePreviewImportRow[] = [];
        const catalogFingerprints = await ensureCatalogFingerprints();

        for (const [index, file] of selectedFiles.entries()) {
            setCurrentFileLabel(`Analisando ${file.name} (${index + 1}/${selectedFiles.length})`);

            const result = await analyzeInventoryScreenshotByIcon({
                file,
                catalog: catalogFingerprints,
                recognizeQuantitySheet: (sheet, onQuantityProgress) => recognizeInventoryImage(
                    sheet,
                    (progress, status) => {
                        onQuantityProgress(progress);
                        const aggregateProgress = ((index + (progress * 0.9)) / selectedFiles.length) * 100;
                        setCurrentFileLabel(`Lendo quantidades de ${file.name} (${status})`);
                        setOcrProgressPct(Math.round(aggregateProgress));
                    },
                    {
                        language: 'eng',
                        workerOptions: {
                            tessedit_char_whitelist: '0123456789.,kKmMxX',
                        },
                    },
                ),
            });

            extractedTexts.push(result.auditText);
            rows.push(...buildEditablePreviewRows(result.rows));
            setOcrProgressPct(Math.round(((index + 1) / selectedFiles.length) * 100));
        }

        if (rows.length === 0) {
            throw new Error('A V2 terminou, mas não encontrou slots ocupados para revisar.');
        }

        return { extractedTexts, rows };
    }

    async function handleProcessScreenshots(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (selectedFiles.length === 0) {
            setOcrError('Selecione pelo menos uma screenshot do inventário ou armazém.');
            return;
        }

        setIsRecognizing(true);
        setOcrError(null);
        setImportFeedback(null);
        resetImportState();

        try {
            const result = recognitionMode === 'icon'
                ? await processIconScreenshots()
                : await processTextScreenshots();

            setOcrTexts(result.extractedTexts);
            setPreviewRows(result.rows);
            setSelectedItemIds(buildDefaultSelectedItemIds(result.rows));
            setSelectionMetadata(result.rows.map(() => null));
        } catch (error) {
            setOcrError(buildImportErrorMessage(error));
        } finally {
            setIsRecognizing(false);
            setCurrentFileLabel('');
        }
    }

    async function handleImportResolvedItems() {
        if (importItems.length === 0) {
            setOcrError('Resolva pelo menos uma linha antes de importar.');
            return;
        }

        const skippedRows = unresolvedRows;

        try {
            setOcrError(null);
            const result = await importMutation.mutateAsync({
                ocrTexts,
                items: importItems,
            });
            await Promise.all([
                utils.inventory.list.invalidate(),
                utils.inventory.listOcrImportHistory.invalidate(),
                utils.inventory.summary.invalidate(),
            ]);

            setImportFeedback(
                skippedRows > 0
                    ? `Importação concluída com ${result.importedRows} linha(s) importada(s). ${skippedRows} linha(s) ainda exigem revisão manual.`
                    : `Importação concluída com ${result.importedRows} linha(s) importada(s).`,
            );

            setSelectedFiles([]);
            resetImportState();
        } catch (error) {
            setOcrError(buildImportErrorMessage(error));
        }
    }

    function handleSelectionChange(index: number, value: string) {
        const nextItemId = value ? Number.parseInt(value, 10) : null;
        setSelectedItemIds((current) => current.map((itemId, itemIndex) => (
            itemIndex === index ? nextItemId : itemId
        )));
    }

    function handleQuantityChange(index: number, value: number) {
        setPreviewRows((current) => current.map((row, rowIndex) => (
            rowIndex === index
                ? {
                    ...row,
                    quantity: value,
                }
                : row
        )));
    }

    function handleSelectionMetaChange(index: number, meta: InventoryImportSelectionMeta | null) {
        setSelectionMetadata((current) => current.map((item, itemIndex) => (
            itemIndex === index ? meta : item
        )));
    }

    const modeBadgeLabel = recognitionMode === 'icon' ? 'V2 assistida' : 'V1 simples';
    const modeBadgeTitle = recognitionMode === 'icon' ? 'Ícone + quantidade + revisão' : 'OCR + revisão';

    return (
        <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-primary">Importar por screenshot</h2>
                    <p className="mt-1 text-sm text-secondary">
                        Envie prints do inventário ou armazém. A V1 lê texto com nome + quantidade.
                        A V2 detecta slots, compara ícones e tenta ler a quantidade antes da revisão final.
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-bg-hover px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-secondary">{modeBadgeLabel}</p>
                    <p className="text-sm font-semibold text-primary">{modeBadgeTitle}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => handleModeChange('text')}
                    className={[
                        'rounded-lg border px-4 py-3 text-left transition-colors',
                        recognitionMode === 'text'
                            ? 'border-gold/40 bg-gold/10'
                            : 'border-border bg-bg-hover/15 hover:border-gold/30',
                    ].join(' ')}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">V1 texto</p>
                    <p className="mt-1 text-sm font-medium text-primary">OCR tradicional com nome + quantidade</p>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('icon')}
                    className={[
                        'rounded-lg border px-4 py-3 text-left transition-colors',
                        recognitionMode === 'icon'
                            ? 'border-gold/40 bg-gold/10'
                            : 'border-border bg-bg-hover/15 hover:border-gold/30',
                    ].join(' ')}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">V2 ícone</p>
                    <p className="mt-1 text-sm font-medium text-primary">Grade visual com ícone + quantidade</p>
                </button>
            </div>

            {recognitionMode === 'icon' ? (
                <div className="mt-4 rounded-lg border border-border bg-bg-hover/15 p-4 text-sm text-secondary">
                    <p className="font-medium text-primary">Modo V2 assistido</p>
                    <p className="mt-1">
                        Use prints da grade do inventário ou armazém com a janela visível. O sistema compara ícones com o catálogo local,
                        tenta ler a quantidade no canto do slot e exige revisão manual antes da importação.
                    </p>
                    {importCatalogQuery.error ? (
                        <p className="mt-2 text-rose-200">{importCatalogQuery.error.message}</p>
                    ) : null}
                </div>
            ) : null}

            <form onSubmit={handleProcessScreenshots} className="mt-5 flex flex-col gap-4">
                <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-border bg-bg-hover/30 p-4 text-sm text-secondary transition-colors hover:border-gold/40">
                    <span className="flex items-center gap-2 font-medium text-primary">
                        <ImagePlus size={18} /> Selecionar screenshots
                    </span>
                    <span>
                        {recognitionMode === 'icon'
                            ? 'Na V2, prefira prints da grade completa do inventário ou armazém.'
                            : 'Suporta múltiplos arquivos para juntar inventário e armazém.'}
                    </span>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleFilesChange}
                    />
                </label>

                {selectedFiles.length > 0 ? (
                    <div className="rounded-lg border border-border bg-bg-hover/20 p-3 text-xs text-secondary">
                        <p className="font-medium text-primary">Arquivos selecionados</p>
                        <ul className="mt-2 space-y-1">
                            {selectedFiles.map((file) => (
                                <li key={`${file.name}-${file.size}`}>{file.name}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={isRecognizing || previewMutation.isPending || (recognitionMode === 'icon' && importCatalogQuery.isFetching)}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-gold/90 px-4 py-2 font-bold text-bg-primary transition-colors hover:bg-gold disabled:opacity-50"
                >
                    {isRecognizing || previewMutation.isPending ? (
                        <>
                            <Loader2 size={18} className="animate-spin" /> {recognitionMode === 'icon' ? 'Processando V2...' : 'Processando OCR...'}
                        </>
                    ) : recognitionMode === 'icon' && importCatalogQuery.isFetching ? (
                        <>
                            <Loader2 size={18} className="animate-spin" /> Carregando catálogo visual...
                        </>
                    ) : (
                        <>
                            <ScanSearch size={18} /> {recognitionMode === 'icon' ? 'Ler screenshots na V2' : 'Ler screenshots'}
                        </>
                    )}
                </button>
            </form>

            {(isRecognizing || currentFileLabel) ? (
                <div className="mt-4 rounded-lg border border-border bg-bg-hover/20 p-4">
                    <div className="flex items-center justify-between gap-4 text-xs text-secondary">
                        <span>{currentFileLabel || (recognitionMode === 'icon' ? 'Preparando V2...' : 'Preparando OCR...')}</span>
                        <span>{ocrProgressPct}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-primary">
                        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${ocrProgressPct}%` }} />
                    </div>
                </div>
            ) : null}

            {ocrError ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>{ocrError}</p>
                </div>
            ) : null}

            {importFeedback ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <p>{importFeedback}</p>
                </div>
            ) : null}

            {previewRows.length > 0 ? (
                <div className="mt-6 space-y-5">
                    <section className="rounded-2xl border border-border bg-bg-hover/15 p-4 md:p-5">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
                            <div>
                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-secondary">Painel de revisão</p>
                                <h3 className="mt-2 text-lg font-semibold text-primary">Confirme cada item pela captura, não só pelo nome lido</h3>
                                <p className="mt-2 max-w-3xl text-sm text-secondary">
                                    Cada card agora mostra a evidência visual captada da screenshot, a quantidade lida e o item atualmente confirmado.
                                    Use a imagem como fonte principal; o nome detectado serve apenas como apoio para acelerar a revisão.
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-xl border border-border bg-bg-primary/40 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-secondary">Linhas lidas</p>
                                        <p className="mt-1 text-lg font-semibold text-primary">{previewRows.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-bg-primary/40 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-secondary">Decisão pendente</p>
                                        <p className="mt-1 text-lg font-semibold text-primary">{reviewGroups.decision.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-bg-primary/40 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-secondary">Revisão final</p>
                                        <p className="mt-1 text-lg font-semibold text-primary">{reviewGroups.check.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-bg-primary/40 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-secondary">Prontos</p>
                                        <p className="mt-1 text-lg font-semibold text-primary">{reviewGroups.ready.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">Como revisar com segurança</p>
                                <ol className="mt-3 space-y-2 text-sm text-primary">
                                    <li>1. Compare a captura original com o item selecionado.</li>
                                    <li>2. Confira o recorte da quantidade antes de confirmar.</li>
                                    <li>3. Use candidatos e busca manual só quando a evidência visual não for suficiente.</li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    <div className="space-y-4">
                        {(['decision', 'check', 'ready'] as const).map((bucket) => {
                            const items = reviewGroups[bucket];
                            if (items.length === 0) {
                                return null;
                            }

                            const meta = REVIEW_BUCKET_META[bucket];

                            return (
                                <section
                                    key={bucket}
                                    className={`space-y-4 rounded-2xl border p-4 ${meta.sectionClassName}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">{meta.title}</p>
                                            <p className="mt-1 text-sm text-secondary">{meta.description}</p>
                                        </div>
                                        <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wide ${meta.badgeClassName}`}>
                                            {items.length} item(ns)
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {items.map(({ row, index }) => (
                                            <InventoryImportReviewRow
                                                key={`${row.normalizedName}-${index}`}
                                                row={row}
                                                rowIndex={index}
                                                selectedItemId={selectedItemIds[index] ?? null}
                                                onSelectionChange={(value) => handleSelectionChange(index, value)}
                                                onQuantityChange={(value) => handleQuantityChange(index, value)}
                                                onSelectionMetaChange={(metaValue) => handleSelectionMetaChange(index, metaValue)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleImportResolvedItems}
                        disabled={importMutation.isPending || importItems.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-2 font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
                    >
                        {importMutation.isPending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Importando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} /> Importar {importItems.length} linha(s) resolvida(s)
                            </>
                        )}
                    </button>
                </div>
            ) : null}

            {ocrTexts.length > 0 ? (
                <details className="mt-6 rounded-lg border border-border bg-bg-hover/10 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                        {recognitionMode === 'icon' ? 'Ver log bruto da V2' : 'Ver texto bruto do OCR'}
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap text-xs text-secondary">
                        {ocrTexts.join('\n\n----------------\n\n')}
                    </pre>
                </details>
            ) : null}
        </div>
    );
}
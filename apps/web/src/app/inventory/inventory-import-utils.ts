export interface InventoryImportEntryInput {
    rawName: string;
    quantity: number;
}

export interface InventoryImportItemCandidate {
    id: number;
    name: string;
    iconUrl: string | null;
    grade: number;
    score: number;
}

export interface InventoryImportCaptureEvidence {
    mode: 'ocr-line' | 'icon-slot';
    imageUrl: string;
    quantityImageUrl?: string | null;
    sourceLabel?: string | null;
}

export interface InventoryImportPreviewRow {
    rawName: string;
    normalizedName: string;
    quantity: number;
    status: 'matched' | 'ambiguous' | 'unmatched';
    matchedItemId: number | null;
    candidates: InventoryImportItemCandidate[];
    recognitionMode?: 'text' | 'icon';
    detectedIconUrl?: string | null;
    captureEvidence?: InventoryImportCaptureEvidence | null;
}

export type InventoryImportSelectionSource = 'ocr' | 'manual' | 'auto';

export interface InventoryImportSelectionMeta {
    selectionSource: InventoryImportSelectionSource;
    score: number;
}

export interface InventoryScreenshotImportItem {
    rawName: string;
    originalQuantity: number;
    confirmedQuantity: number;
    selectedItemId: number;
    score: number;
    selectionSource: InventoryImportSelectionSource;
}

const OCR_LINE_PATTERNS = [
    /^(.*?)(?:\s+|[:;|_-]{1,3})(?:[xX×]\s*)?([0-9][0-9.,\s]*)$/,
    /^(.*?)[xX×]\s*([0-9][0-9.,\s]*)$/,
];

const IGNORED_OCR_NAME_TERMS = [
    'peso',
    'capacidade',
    'inventario',
    'armazem',
    'patrimonio',
    'slot',
];

const ICON_ASSISTED_AUTO_SELECT_MIN_SCORE = 0.82;
const ICON_ASSISTED_AUTO_SELECT_MIN_GAP = 0.03;

function sanitizeInventoryOcrLine(value: string): string {
    return String(value ?? '')
        .replace(/[|•·]+/g, ' ')
        .replace(/[–—]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanInventoryOcrName(value: string): string {
    return String(value ?? '')
        .replace(/^[^A-Za-zÀ-ÿ0-9(]+/g, '')
        .replace(/[^A-Za-zÀ-ÿ0-9)]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeInventoryImportName(value: string): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function tokenizeNormalizedInventoryImportName(value: string): string[] {
    return normalizeInventoryImportName(value)
        .split(' ')
        .filter((token) => token.length >= 2);
}

export function parseInventoryOcrQuantity(value: string): number | null {
    const digits = String(value ?? '').replace(/[^0-9]/g, '');
    if (!digits) {
        return null;
    }

    const quantity = Number.parseInt(digits, 10);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

export function mergeInventoryImportEntries(entries: InventoryImportEntryInput[]): InventoryImportEntryInput[] {
    const mergedEntries = new Map<string, InventoryImportEntryInput>();

    for (const entry of entries) {
        const normalizedName = normalizeInventoryImportName(entry.rawName);
        if (!normalizedName || !Number.isSafeInteger(entry.quantity) || entry.quantity <= 0) {
            continue;
        }

        const existingEntry = mergedEntries.get(normalizedName);
        if (existingEntry) {
            existingEntry.quantity += entry.quantity;
            continue;
        }

        mergedEntries.set(normalizedName, {
            rawName: cleanInventoryOcrName(entry.rawName) || entry.rawName.trim(),
            quantity: entry.quantity,
        });
    }

    return Array.from(mergedEntries.values());
}

export function parseInventoryOcrText(rawText: string): InventoryImportEntryInput[] {
    const entries = String(rawText ?? '')
        .split(/\r?\n/g)
        .map((line) => parseInventoryOcrLineEntry(line))
        .filter((entry): entry is InventoryImportEntryInput => entry != null);

    return mergeInventoryImportEntries(entries);
}

export function parseInventoryOcrLineEntry(rawLine: string): InventoryImportEntryInput | null {
    const line = sanitizeInventoryOcrLine(rawLine);
    if (!line) {
        return null;
    }

    const patternMatch = OCR_LINE_PATTERNS
        .map((pattern) => line.match(pattern))
        .find((match) => match != null);

    if (!patternMatch) {
        return null;
    }

    const rawName = cleanInventoryOcrName(patternMatch[1] ?? '');
    const quantity = parseInventoryOcrQuantity(patternMatch[2] ?? '');
    const normalizedName = normalizeInventoryImportName(rawName);
    const shouldIgnoreName = IGNORED_OCR_NAME_TERMS.some((term) => normalizedName.includes(term));
    if (!rawName || quantity === null || !normalizedName || shouldIgnoreName) {
        return null;
    }

    return { rawName, quantity };
}

export function buildDefaultSelectedItemIds(rows: InventoryImportPreviewRow[]): Array<number | null> {
    return rows.map((row) => getDefaultSelectedItemId(row));
}

function getIconAssistedAutoSelectedItemId(row: InventoryImportPreviewRow): number | null {
    if (row.recognitionMode !== 'icon' || row.matchedItemId || row.status === 'unmatched') {
        return null;
    }

    const bestCandidate = row.candidates[0] ?? null;
    const secondCandidate = row.candidates[1] ?? null;
    const scoreGap = (bestCandidate?.score ?? 0) - (secondCandidate?.score ?? 0);
    if (!bestCandidate) {
        return null;
    }

    if (bestCandidate.score < ICON_ASSISTED_AUTO_SELECT_MIN_SCORE || scoreGap < ICON_ASSISTED_AUTO_SELECT_MIN_GAP) {
        return null;
    }

    return bestCandidate.id;
}

function getDefaultSelectedItemId(row: InventoryImportPreviewRow): number | null {
    return row.matchedItemId ?? getIconAssistedAutoSelectedItemId(row) ?? null;
}

export function countResolvedInventoryImportRows(
    rows: InventoryImportPreviewRow[],
    selectedItemIds: Array<number | null>,
): number {
    return rows.reduce((total, row, index) => {
        const itemId = selectedItemIds[index] ?? row.matchedItemId;
        return itemId ? total + 1 : total;
    }, 0);
}

export function prioritizeInventoryImportCandidates(
    searchTerm: string,
    candidates: InventoryImportItemCandidate[],
): InventoryImportItemCandidate[] {
    const normalizedSearchTerm = normalizeInventoryImportName(searchTerm);
    const searchTokens = tokenizeNormalizedInventoryImportName(normalizedSearchTerm);

    return [...candidates]
        .map((candidate) => {
            const normalizedCandidateName = normalizeInventoryImportName(candidate.name);
            if (!normalizedSearchTerm || !normalizedCandidateName) {
                return candidate;
            }

            if (normalizedCandidateName === normalizedSearchTerm) {
                return { ...candidate, score: Math.max(candidate.score, 1) };
            }

            const candidateTokens = tokenizeNormalizedInventoryImportName(normalizedCandidateName);
            const matchedTokens = searchTokens.reduce((total, searchToken) => {
                const foundMatch = candidateTokens.some((candidateToken) => (
                    candidateToken === searchToken
                    || candidateToken.startsWith(searchToken)
                    || candidateToken.includes(searchToken)
                    || searchToken.includes(candidateToken)
                ));

                return foundMatch ? total + 1 : total;
            }, 0);

            const tokenCoverage = searchTokens.length > 0 ? matchedTokens / searchTokens.length : 0;
            const containsBonus = normalizedCandidateName.includes(normalizedSearchTerm)
                || normalizedSearchTerm.includes(normalizedCandidateName)
                ? 0.16
                : 0;
            const startsWithBonus = normalizedCandidateName.startsWith(normalizedSearchTerm)
                || normalizedSearchTerm.startsWith(normalizedCandidateName)
                ? 0.14
                : 0;
            const lengthPenalty = Math.min(
                Math.abs(normalizedCandidateName.length - normalizedSearchTerm.length)
                    / Math.max(normalizedCandidateName.length, normalizedSearchTerm.length),
                1,
            );

            const rankedScore = Math.max(
                0,
                Math.min(1, (tokenCoverage * 0.72) + containsBonus + startsWithBonus - (lengthPenalty * 0.12)),
            );

            return {
                ...candidate,
                score: Math.max(candidate.score, rankedScore),
            };
        })
        .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name) || left.id - right.id);
}

function clampInventoryImportScore(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
}

export function getInventoryImportSelectionMeta(
    row: InventoryImportPreviewRow,
    selectedItemId: number | null,
    manualCandidates: InventoryImportItemCandidate[] = [],
    autoSelectedItemId: number | null = null,
): InventoryImportSelectionMeta | null {
    if (!selectedItemId) {
        return null;
    }

    const ocrCandidate = row.candidates.find((candidate) => candidate.id === selectedItemId) ?? null;
    const manualCandidate = manualCandidates.find((candidate) => candidate.id === selectedItemId) ?? null;
    const iconAutoSelectedItemId = getIconAssistedAutoSelectedItemId(row);

    if (autoSelectedItemId === selectedItemId) {
        return {
            selectionSource: 'auto',
            score: clampInventoryImportScore(manualCandidate?.score ?? ocrCandidate?.score ?? 0),
        };
    }

    if (iconAutoSelectedItemId === selectedItemId) {
        return {
            selectionSource: 'auto',
            score: clampInventoryImportScore(ocrCandidate?.score ?? 0),
        };
    }

    if (ocrCandidate) {
        return {
            selectionSource: 'ocr',
            score: clampInventoryImportScore(ocrCandidate.score),
        };
    }

    if (manualCandidate) {
        return {
            selectionSource: 'manual',
            score: clampInventoryImportScore(manualCandidate.score),
        };
    }

    return null;
}

export function buildInventoryImportBulkItems(
    rows: InventoryImportPreviewRow[],
    selectedItemIds: Array<number | null>,
): Array<{ itemId: number; quantity: number }> {
    const quantityByItemId = new Map<number, number>();

    rows.forEach((row, index) => {
        const itemId = selectedItemIds[index] ?? row.matchedItemId;
        if (!itemId) {
            return;
        }

        quantityByItemId.set(itemId, (quantityByItemId.get(itemId) ?? 0) + row.quantity);
    });

    return Array.from(quantityByItemId.entries())
        .map(([itemId, quantity]) => ({ itemId, quantity }))
        .sort((left, right) => left.itemId - right.itemId);
}

export function buildInventoryScreenshotImportItems(
    rows: Array<InventoryImportPreviewRow & { originalQuantity?: number }>,
    selectedItemIds: Array<number | null>,
    selectionMetadata: Array<InventoryImportSelectionMeta | null>,
): InventoryScreenshotImportItem[] {
    return rows.reduce<InventoryScreenshotImportItem[]>((items, row, index) => {
        const selectedItemId = selectedItemIds[index] ?? getDefaultSelectedItemId(row);
        if (!selectedItemId) {
            return items;
        }

        const selectionMeta = selectionMetadata[index] ?? getInventoryImportSelectionMeta(row, selectedItemId);
        if (!selectionMeta) {
            return items;
        }

        items.push({
            rawName: row.rawName,
            originalQuantity: row.originalQuantity ?? row.quantity,
            confirmedQuantity: row.quantity,
            selectedItemId,
            score: selectionMeta.score,
            selectionSource: selectionMeta.selectionSource,
        });

        return items;
    }, []);
}
'use client';

import { resolveBdoIconUrl } from '@/lib/icon-url';
import {
    normalizeInventoryImportName,
    type InventoryImportItemCandidate,
    type InventoryImportPreviewRow,
} from './inventory-import-utils';

const GRID_COLUMNS = 8;
const CANDIDATE_LIMIT = 4;
const FINGERPRINT_SIZE = 16;
const MATCHED_MIN_SCORE = 0.94;
const AMBIGUOUS_MIN_SCORE = 0.72;
const MATCH_GAP_MIN_SCORE = 0.05;
const GRID_MIN_ROWS = 8;
const GRID_MAX_ROWS = 12;
const OCCUPIED_SLOT_MIN_SCORE = 0.095;
const MIN_DETECTED_SLOTS = 4;

const GRID_LAYOUT_PRESETS = [
    {
        name: 'panel-cropped',
        startX: 0.015,
        endX: 0.985,
        startY: 0.14,
        endY: 0.985,
    },
    {
        name: 'panel-wide',
        startX: 0.03,
        endX: 0.97,
        startY: 0.16,
        endY: 0.99,
    },
    {
        name: 'game-right-panel',
        startX: 0.6,
        endX: 0.965,
        startY: 0.12,
        endY: 0.92,
    },
] as const;

export interface InventoryImportCatalogItem {
    id: number;
    name: string;
    iconUrl: string | null;
    grade: number;
}

interface InventoryIconFingerprint {
    values: number[];
    brightness: number;
    saturation: number;
    contrast: number;
}

export interface InventoryCatalogFingerprintItem extends InventoryImportCatalogItem {
    iconUrl: string;
    fingerprint: InventoryIconFingerprint;
}

interface DetectedInventorySlot {
    slotIndex: number;
    iconCanvas: HTMLCanvasElement;
    quantityCanvas: HTMLCanvasElement;
    fingerprint: InventoryIconFingerprint;
    occupancyScore: number;
}

export interface InventoryGridEvaluationScoreInput {
    occupiedCount: number;
    totalSlots: number;
    averageOccupancy: number;
    averageTopOccupancy: number;
}

interface DetectedGridEvaluation extends InventoryGridEvaluationScoreInput {
    presetName: string;
    rowCount: number;
    score: number;
    slots: DetectedInventorySlot[];
}

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function average(values: number[]) {
    if (values.length === 0) {
        return 0;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
}

function createCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
}

function canvasToDataUrl(canvas: HTMLCanvasElement) {
    return canvas.toDataURL('image/png');
}

function loadImage(src: string | File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        const objectUrl = typeof src === 'string' ? null : URL.createObjectURL(src);
        image.onload = () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            resolve(image);
        };
        image.onerror = () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            reject(new Error(`Não foi possível carregar a imagem ${typeof src === 'string' ? src : src.name}.`));
        };
        image.src = typeof src === 'string' ? src : objectUrl;
    });
}

function applyBinaryThreshold(canvas: HTMLCanvasElement, threshold = 0.62) {
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas 2D indisponível para preprocessar quantidades.');
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    for (let index = 0; index < data.length; index += 4) {
        const brightness = ((data[index] ?? 0) + (data[index + 1] ?? 0) + (data[index + 2] ?? 0)) / (255 * 3);
        const channel = brightness >= threshold ? 255 : 0;
        data[index] = channel;
        data[index + 1] = channel;
        data[index + 2] = channel;
        data[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
}

function buildFingerprint(sourceCanvas: HTMLCanvasElement): InventoryIconFingerprint {
    const canvas = createCanvas(FINGERPRINT_SIZE, FINGERPRINT_SIZE);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas 2D indisponível para processar ícones.');
    }

    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const values: number[] = [];
    let brightnessTotal = 0;
    let saturationTotal = 0;
    let brightnessSquaredTotal = 0;
    const bucketSize = 4;

    for (let blockY = 0; blockY < canvas.height; blockY += bucketSize) {
        for (let blockX = 0; blockX < canvas.width; blockX += bucketSize) {
            let red = 0;
            let green = 0;
            let blue = 0;
            let pixels = 0;

            for (let y = blockY; y < Math.min(blockY + bucketSize, canvas.height); y += 1) {
                for (let x = blockX; x < Math.min(blockX + bucketSize, canvas.width); x += 1) {
                    const index = ((y * canvas.width) + x) * 4;
                    const r = data[index] ?? 0;
                    const g = data[index + 1] ?? 0;
                    const b = data[index + 2] ?? 0;
                    const brightness = (r + g + b) / (255 * 3);
                    const maxChannel = Math.max(r, g, b);
                    const minChannel = Math.min(r, g, b);
                    const saturation = (maxChannel - minChannel) / 255;

                    red += r / 255;
                    green += g / 255;
                    blue += b / 255;
                    brightnessTotal += brightness;
                    brightnessSquaredTotal += brightness * brightness;
                    saturationTotal += saturation;
                    pixels += 1;
                }
            }

            values.push(red / pixels, green / pixels, blue / pixels);
        }
    }

    const magnitude = Math.sqrt(values.reduce((total, value) => total + (value * value), 0)) || 1;
    const pixelCount = canvas.width * canvas.height;
    const brightness = brightnessTotal / pixelCount;
    const contrast = Math.sqrt(Math.max(0, (brightnessSquaredTotal / pixelCount) - (brightness * brightness)));

    return {
        values: values.map((value) => value / magnitude),
        brightness,
        saturation: saturationTotal / pixelCount,
        contrast,
    };
}

function scoreFingerprints(left: InventoryIconFingerprint, right: InventoryIconFingerprint) {
    const dotProduct = left.values.reduce((total, value, index) => total + (value * (right.values[index] ?? 0)), 0);
    const brightnessPenalty = Math.abs(left.brightness - right.brightness) * 0.14;
    const saturationPenalty = Math.abs(left.saturation - right.saturation) * 0.1;
    const contrastPenalty = Math.abs(left.contrast - right.contrast) * 0.08;
    return clamp01(dotProduct - brightnessPenalty - saturationPenalty - contrastPenalty);
}

function scoreSlotOccupancy(fingerprint: InventoryIconFingerprint) {
    return (fingerprint.contrast * 0.75) + (fingerprint.saturation * 0.25);
}

function classifyCandidates(candidates: InventoryImportItemCandidate[]) {
    const best = candidates[0] ?? null;
    const second = candidates[1] ?? null;
    const gap = (best?.score ?? 0) - (second?.score ?? 0);

    if (!best || best.score < AMBIGUOUS_MIN_SCORE) {
        return { status: 'unmatched' as const, matchedItemId: null };
    }

    if (best.score >= MATCHED_MIN_SCORE && gap >= MATCH_GAP_MIN_SCORE) {
        return { status: 'matched' as const, matchedItemId: best.id };
    }

    return { status: 'ambiguous' as const, matchedItemId: null };
}

export function parseInventoryVisualQuantity(value: string): number | null {
    const normalized = String(value ?? '').trim().toLowerCase();
    const suffixMatch = normalized.match(/([0-9]+(?:[.,][0-9]+)?)\s*([km])/i);
    if (suffixMatch) {
        const base = Number.parseFloat((suffixMatch[1] ?? '0').replace(',', '.'));
        const multiplier = suffixMatch[2]?.toLowerCase() === 'm' ? 1_000_000 : 1_000;
        const quantity = Math.round(base * multiplier);
        return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
    }

    const digits = normalized.replace(/[^0-9]/g, '');
    if (!digits) {
        return null;
    }

    const quantity = Number.parseInt(digits, 10);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

export function parseInventoryVisualQuantityText(rawText: string, slotCount: number) {
    const lines = String(rawText ?? '')
        .split(/\r?\n/g)
        .map((line) => parseInventoryVisualQuantity(line))
        .filter((value): value is number => value != null);

    const tokens = String(rawText ?? '')
        .match(/[0-9]+(?:[.,][0-9]+)?\s*[km]?/gi)
        ?.map((token) => parseInventoryVisualQuantity(token))
        .filter((value): value is number => value != null) ?? [];

    const quantities = (lines.length >= slotCount ? lines : tokens).slice(0, slotCount);
    return Array.from({ length: slotCount }, (_, index) => quantities[index] ?? 1);
}

export function rankInventoryIconCandidates(
    slotFingerprint: InventoryIconFingerprint,
    catalog: InventoryCatalogFingerprintItem[],
) {
    return catalog
        .map<InventoryImportItemCandidate>((item) => ({
            id: item.id,
            name: item.name,
            iconUrl: item.iconUrl,
            grade: item.grade,
            score: scoreFingerprints(slotFingerprint, item.fingerprint),
        }))
        .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name) || left.id - right.id)
        .slice(0, CANDIDATE_LIMIT);
}

export function scoreInventoryGridEvaluation(input: InventoryGridEvaluationScoreInput) {
    const coverageRatio = input.totalSlots > 0 ? input.occupiedCount / input.totalSlots : 0;
    const sparsePenalty = input.occupiedCount < MIN_DETECTED_SLOTS ? -20 : 0;

    return (
        (input.occupiedCount * 2.2)
        + (coverageRatio * 6)
        + (input.averageOccupancy * 10)
        + (input.averageTopOccupancy * 12)
        + sparsePenalty
    );
}

export function chooseBestInventoryGridEvaluation<T extends InventoryGridEvaluationScoreInput>(evaluations: T[]) {
    return evaluations
        .map((evaluation) => ({ evaluation, score: scoreInventoryGridEvaluation(evaluation) }))
        .sort((left, right) => {
            return right.score - left.score
                || right.evaluation.occupiedCount - left.evaluation.occupiedCount
                || right.evaluation.averageTopOccupancy - left.evaluation.averageTopOccupancy
                || right.evaluation.averageOccupancy - left.evaluation.averageOccupancy
                || right.evaluation.totalSlots - left.evaluation.totalSlots;
        })[0]?.evaluation ?? null;
}

export async function buildInventoryCatalogFingerprints(
    items: InventoryImportCatalogItem[],
    onProgress?: (progress: number) => void,
) {
    const catalog = items
        .map((item) => ({ ...item, iconUrl: resolveBdoIconUrl(item.iconUrl) }))
        .filter((item): item is InventoryImportCatalogItem & { iconUrl: string } => Boolean(item.iconUrl));
    const results: InventoryCatalogFingerprintItem[] = [];

    for (const [index, item] of catalog.entries()) {
        const image = await loadImage(item.iconUrl);
        const canvas = createCanvas(image.naturalWidth || 48, image.naturalHeight || 48);
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas 2D indisponível para processar catálogo visual.');
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        results.push({ ...item, fingerprint: buildFingerprint(canvas) });
        onProgress?.((index + 1) / catalog.length);
    }

    return results;
}

function measureDetectedLayout(
    image: HTMLImageElement,
    preset: (typeof GRID_LAYOUT_PRESETS)[number],
    rowCount: number,
): DetectedGridEvaluation {
    const panelWidth = image.naturalWidth * (preset.endX - preset.startX);
    const panelHeight = image.naturalHeight * (preset.endY - preset.startY);
    const originX = image.naturalWidth * preset.startX;
    const originY = image.naturalHeight * preset.startY;
    const cellWidth = panelWidth / GRID_COLUMNS;
    const cellHeight = panelHeight / rowCount;
    const slots: DetectedInventorySlot[] = [];
    const occupiedScores: number[] = [];

    for (let row = 0; row < rowCount; row += 1) {
        for (let column = 0; column < GRID_COLUMNS; column += 1) {
            const slotX = originX + (column * cellWidth);
            const slotY = originY + (row * cellHeight);
            const iconSize = Math.max(18, Math.min(cellWidth, cellHeight) * 0.78);
            const iconInsetX = Math.max(0, (cellWidth - iconSize) / 2);
            const iconInsetY = Math.max(0, (cellHeight * 0.08));
            const quantityX = slotX + (cellWidth * 0.05);
            const quantityY = slotY + (cellHeight * 0.6);
            const quantityWidth = cellWidth * 0.9;
            const quantityHeight = cellHeight * 0.32;

            const iconCanvas = createCanvas(iconSize, iconSize);
            const iconContext = iconCanvas.getContext('2d');
            const quantityCanvas = createCanvas(quantityWidth * 3, quantityHeight * 3.8);
            const quantityContext = quantityCanvas.getContext('2d');
            if (!iconContext || !quantityContext) {
                throw new Error('Canvas 2D indisponível para detectar slots do inventário.');
            }

            iconContext.imageSmoothingEnabled = false;
            quantityContext.imageSmoothingEnabled = false;
            iconContext.drawImage(image, slotX + iconInsetX, slotY + iconInsetY, iconSize, iconSize, 0, 0, iconCanvas.width, iconCanvas.height);
            const iconFingerprint = buildFingerprint(iconCanvas);
            const occupancyScore = scoreSlotOccupancy(iconFingerprint);
            if (occupancyScore < OCCUPIED_SLOT_MIN_SCORE) {
                continue;
            }

            quantityContext.fillStyle = '#ffffff';
            quantityContext.fillRect(0, 0, quantityCanvas.width, quantityCanvas.height);
            quantityContext.filter = 'grayscale(1) contrast(2.4) brightness(1.55)';
            quantityContext.drawImage(image, quantityX, quantityY, quantityWidth, quantityHeight, 0, 0, quantityCanvas.width, quantityCanvas.height);
            quantityContext.filter = 'none';
            applyBinaryThreshold(quantityCanvas);

            occupiedScores.push(occupancyScore);
            slots.push({
                slotIndex: (row * GRID_COLUMNS) + column,
                iconCanvas,
                quantityCanvas,
                fingerprint: iconFingerprint,
                occupancyScore,
            });
        }
    }

    const topScores = [...occupiedScores].sort((left, right) => right - left).slice(0, 8);
    const scoreInput = {
        occupiedCount: slots.length,
        totalSlots: rowCount * GRID_COLUMNS,
        averageOccupancy: average(occupiedScores),
        averageTopOccupancy: average(topScores),
    };

    return {
        presetName: preset.name,
        rowCount,
        score: scoreInventoryGridEvaluation(scoreInput),
        slots,
        ...scoreInput,
    };
}

function detectInventorySlots(image: HTMLImageElement) {
    const evaluations: DetectedGridEvaluation[] = [];
    for (const preset of GRID_LAYOUT_PRESETS) {
        for (let rowCount = GRID_MIN_ROWS; rowCount <= GRID_MAX_ROWS; rowCount += 1) {
            evaluations.push(measureDetectedLayout(image, preset, rowCount));
        }
    }

    const bestEvaluation = chooseBestInventoryGridEvaluation(evaluations);
    if (!bestEvaluation || bestEvaluation.occupiedCount < MIN_DETECTED_SLOTS) {
        return {
            evaluation: bestEvaluation,
            slots: [] as DetectedInventorySlot[],
        };
    }

    return {
        evaluation: bestEvaluation,
        slots: bestEvaluation.slots,
    };
}

function buildQuantitySheet(slots: DetectedInventorySlot[]) {
    const rowHeight = 42;
    const canvas = createCanvas(220, Math.max(rowHeight * slots.length, rowHeight));
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas 2D indisponível para OCR de quantidades.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    slots.forEach((slot, index) => {
        context.imageSmoothingEnabled = false;
        context.drawImage(slot.quantityCanvas, 8, index * rowHeight, 200, 32);
    });

    applyBinaryThreshold(canvas, 0.58);

    return canvas;
}

export async function analyzeInventoryScreenshotByIcon(input: {
    file: File;
    catalog: InventoryCatalogFingerprintItem[];
    recognizeQuantitySheet: (sheet: HTMLCanvasElement, onProgress: (progress: number) => void) => Promise<string>;
}) {
    const image = await loadImage(input.file);
    const { slots, evaluation } = detectInventorySlots(image);

    if (slots.length === 0) {
        return {
            rows: [] as InventoryImportPreviewRow[],
            auditText: [
                `V2 ícone :: ${input.file.name}`,
                evaluation
                    ? `Layout tentado: ${evaluation.presetName} (${evaluation.rowCount} linhas, ${evaluation.occupiedCount} slots ocupados)`
                    : 'Nenhum layout elegível foi encontrado.',
                'Nenhum slot ocupado foi detectado.',
            ].join('\n'),
        };
    }

    const quantitySheet = buildQuantitySheet(slots);
    const quantityText = await input.recognizeQuantitySheet(quantitySheet, () => undefined);
    const quantities = parseInventoryVisualQuantityText(quantityText, slots.length);

    const rows = slots.map<InventoryImportPreviewRow>((slot, index) => {
        const candidates = rankInventoryIconCandidates(slot.fingerprint, input.catalog);
        const classification = classifyCandidates(candidates);
        const bestCandidate = candidates[0] ?? null;
        const rawName = bestCandidate?.name ?? `Slot ${String(slot.slotIndex + 1).padStart(2, '0')}`;

        return {
            rawName,
            normalizedName: normalizeInventoryImportName(rawName),
            quantity: quantities[index] ?? 1,
            status: classification.status,
            matchedItemId: classification.matchedItemId,
            candidates,
            recognitionMode: 'icon',
            detectedIconUrl: bestCandidate?.iconUrl ?? null,
            captureEvidence: {
                mode: 'icon-slot',
                imageUrl: canvasToDataUrl(slot.iconCanvas),
                quantityImageUrl: canvasToDataUrl(slot.quantityCanvas),
                sourceLabel: `${input.file.name} · slot ${String(slot.slotIndex + 1).padStart(2, '0')}`,
            },
        };
    });

    const auditText = [
        `V2 ícone :: ${input.file.name}`,
        evaluation
            ? `Layout escolhido: ${evaluation.presetName} (${evaluation.rowCount} linhas, ${evaluation.occupiedCount}/${evaluation.totalSlots} slots, score ${evaluation.score.toFixed(2)})`
            : 'Layout escolhido: indisponível',
        ...rows.map((row, index) => `${index + 1}. ${row.rawName} x${row.quantity} [${row.status}]`),
        '',
        'OCR bruto de quantidades:',
        quantityText.trim() || '(vazio)',
    ].join('\n');

    return { rows, auditText };
}
'use client';

import {
    normalizeInventoryImportName,
    parseInventoryOcrLineEntry,
    type InventoryImportCaptureEvidence,
    type InventoryImportEntryInput,
} from './inventory-import-utils';

type TesseractModule = typeof import('tesseract.js');

export interface InventoryRecognizedOcrLine {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number } | null;
}

export interface InventoryRecognizeImageResult {
    text: string;
    lines: InventoryRecognizedOcrLine[];
}

export interface InventoryDetectedOcrEntryEvidence {
    entry: InventoryImportEntryInput;
    normalizedName: string;
    captureEvidence: InventoryImportCaptureEvidence | null;
}

function createCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

async function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Não foi possível carregar a imagem ${file.name}.`));
        };
        image.src = objectUrl;
    });
}

function cropToDataUrl(source: HTMLCanvasElement, left: number, top: number, width: number, height: number) {
    const safeLeft = clamp(left, 0, source.width - 1);
    const safeTop = clamp(top, 0, source.height - 1);
    const safeWidth = clamp(width, 1, source.width - safeLeft);
    const safeHeight = clamp(height, 1, source.height - safeTop);
    const canvas = createCanvas(safeWidth, safeHeight);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas 2D indisponível para gerar recorte do OCR.');
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(source, safeLeft, safeTop, safeWidth, safeHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

export async function recognizeInventoryImageDetailed(
    source: File | HTMLCanvasElement,
    onProgress: (progress: number, status: string) => void,
    options?: { language?: string; workerOptions?: Record<string, unknown> },
): Promise<InventoryRecognizeImageResult> {
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

    const lines = Array.isArray(result.data?.lines)
        ? result.data.lines.map((line) => ({
            text: typeof line?.text === 'string' ? line.text : '',
            bbox: line?.bbox && [line.bbox.x0, line.bbox.y0, line.bbox.x1, line.bbox.y1].every(Number.isFinite)
                ? { x0: line.bbox.x0, y0: line.bbox.y0, x1: line.bbox.x1, y1: line.bbox.y1 }
                : null,
        })).filter((line) => line.text.trim().length > 0)
        : [];

    return { text: result.data?.text ?? '', lines };
}

export async function buildInventoryDetectedOcrEntryEvidence(
    file: File,
    recognized: InventoryRecognizeImageResult,
): Promise<InventoryDetectedOcrEntryEvidence[]> {
    const image = await loadImage(file);
    const sourceCanvas = createCanvas(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const context = sourceCanvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas 2D indisponível para preparar a evidência do OCR.');
    }

    context.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

    return recognized.lines.reduce<InventoryDetectedOcrEntryEvidence[]>((items, line) => {
        const entry = parseInventoryOcrLineEntry(line.text);
        if (!entry) {
            return items;
        }

        const bbox = line.bbox;
        const captureEvidence = bbox
            ? {
                mode: 'ocr-line' as const,
                imageUrl: cropToDataUrl(sourceCanvas, bbox.x0 - 10, bbox.y0 - 6, (bbox.x1 - bbox.x0) + 20, (bbox.y1 - bbox.y0) + 12),
                quantityImageUrl: cropToDataUrl(sourceCanvas, bbox.x0 + ((bbox.x1 - bbox.x0) * 0.62), bbox.y0 - 4, (bbox.x1 - bbox.x0) * 0.38, (bbox.y1 - bbox.y0) + 8),
                sourceLabel: `${file.name} · linha OCR`,
            }
            : null;

        items.push({
            entry,
            normalizedName: normalizeInventoryImportName(entry.rawName),
            captureEvidence,
        });
        return items;
    }, []);
}
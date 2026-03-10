export const INVENTORY_SCREENSHOT_IMPORT_SELECTION_SOURCES = ['ocr', 'manual', 'auto'] as const;

export type InventoryScreenshotImportSelectionSource =
    (typeof INVENTORY_SCREENSHOT_IMPORT_SELECTION_SOURCES)[number];

export interface InventoryScreenshotImportResolvedRow {
    rawName: string;
    originalQuantity: number;
    confirmedQuantity: number;
    selectedItemId: number;
    score: number;
    selectionSource: InventoryScreenshotImportSelectionSource;
}

export function buildInventoryScreenshotImportInventoryItems(
    rows: InventoryScreenshotImportResolvedRow[],
): Array<{ itemId: number; quantity: number }> {
    const quantityByItemId = new Map<number, number>();

    for (const row of rows) {
        quantityByItemId.set(
            row.selectedItemId,
            (quantityByItemId.get(row.selectedItemId) ?? 0) + row.confirmedQuantity,
        );
    }

    return Array.from(quantityByItemId.entries())
        .map(([itemId, quantity]) => ({ itemId, quantity }))
        .sort((left, right) => left.itemId - right.itemId);
}

export function summarizeInventoryScreenshotImport(rows: InventoryScreenshotImportResolvedRow[]) {
    return {
        importedRowCount: rows.length,
        importedQuantityTotal: rows.reduce((total, row) => total + row.confirmedQuantity, 0),
    };
}
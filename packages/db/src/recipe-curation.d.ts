export type RecipeCurationTypeFilter = 'all' | 'cooking' | 'alchemy' | 'processing';
export type RecipeCurationSource = 'db' | 'json';

export interface RecipeCurationRecord {
    canonicalKey?: string;
    legacyRecipeIds?: number[];
    primaryLegacyRecipeId?: number | null;
    nameOverride?: string | null;
    notes?: string | null;
    slots?: Array<{
        index?: number;
        slotKey?: string | null;
        label?: string | null;
        defaultItemId?: number | null;
        defaultQuantity?: number | null;
    }>;
}

export interface RecipeCurationDraft {
    canonicalKey: string;
    legacyRecipeIds: number[];
    primaryLegacyRecipeId: number | null;
    nameOverride: string | null;
    notes: string | null;
    slots: Array<{
        index: number;
        slotKey: string;
        label: string | null;
        defaultItemId: number | null;
        defaultQuantity: number | null;
    }>;
}

export function buildRecipeCurationDraft(input: {
    canonicalKey: string;
    craftName: string;
    variants: Array<{ legacyRecipeId: number | null; isPrimary: boolean }>;
    slots: Array<{
        sortOrder: number;
        slotKey: string;
        label: string | null;
        options: Array<{ itemId: number; quantity: number; isDefault: boolean }>;
    }>;
    currentCuration?: RecipeCurationRecord | null;
}): RecipeCurationDraft;
export function mergeRecipeCurations(input?: {
    jsonRecords?: RecipeCurationRecord[];
    dbRecords?: RecipeCurationRecord[];
}): {
    jsonByCanonicalKey: Map<string, RecipeCurationRecord>;
    dbByCanonicalKey: Map<string, RecipeCurationRecord>;
    effectiveByCanonicalKey: Map<string, RecipeCurationRecord>;
    sourceByCanonicalKey: Map<string, RecipeCurationSource>;
};
export function normalizeRecipeCurationDraft(draft: unknown): RecipeCurationDraft;
export function normalizeRecipeCurationRecord(record: unknown): RecipeCurationRecord | null;
export function normalizeRecipeCurationSearchTerm(value: string | string[] | undefined): string;
export function normalizeRecipeCurationTypeFilter(value: string | string[] | undefined): RecipeCurationTypeFilter;
export function parseRecipeCurationDraft(rawDraft: string): RecipeCurationDraft;
export function serializeRecipeCurationDraft(draft: RecipeCurationDraft): string;
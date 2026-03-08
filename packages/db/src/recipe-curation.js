function toSingleValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
    const normalized = normalizeString(value);
    return normalized || null;
}

function toPositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toNonNegativeInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizePositiveIntegerList(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return Array.from(new Set(
        values
            .map((value) => toPositiveInteger(value))
            .filter((value) => value != null),
    )).sort((left, right) => left - right);
}

function normalizeRecipeCurationTypeFilter(value) {
    const normalized = normalizeString(toSingleValue(value)).toLowerCase();
    return ['all', 'cooking', 'alchemy', 'processing'].includes(normalized) ? normalized : 'all';
}

function normalizeRecipeCurationSearchTerm(value) {
    return normalizeString(toSingleValue(value));
}

function normalizeRecipeCurationRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return null;
    }

    const canonicalKey = normalizeString(record.canonicalKey);
    const legacyRecipeIds = normalizePositiveIntegerList(record.legacyRecipeIds);
    const primaryLegacyRecipeId = toPositiveInteger(record.primaryLegacyRecipeId);
    const slots = Array.isArray(record.slots)
        ? record.slots
            .map((slot) => {
                const index = toNonNegativeInteger(slot?.index);
                if (index == null) {
                    return null;
                }

                return {
                    index,
                    slotKey: normalizeNullableString(slot?.slotKey),
                    label: normalizeNullableString(slot?.label),
                    defaultItemId: toPositiveInteger(slot?.defaultItemId),
                    defaultQuantity: toPositiveInteger(slot?.defaultQuantity),
                };
            })
            .filter(Boolean)
            .sort((left, right) => left.index - right.index)
        : [];

    return {
        canonicalKey: canonicalKey || undefined,
        legacyRecipeIds,
        primaryLegacyRecipeId: primaryLegacyRecipeId && legacyRecipeIds.includes(primaryLegacyRecipeId)
            ? primaryLegacyRecipeId
            : legacyRecipeIds[0] ?? primaryLegacyRecipeId ?? null,
        nameOverride: normalizeNullableString(record.nameOverride),
        notes: normalizeNullableString(record.notes),
        slots,
    };
}

function normalizeRecipeCurationDraft(draft) {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
        throw new Error('O draft de curadoria deve ser um objeto JSON.');
    }

    const canonicalKey = normalizeString(draft.canonicalKey);
    if (!canonicalKey) {
        throw new Error('canonicalKey é obrigatório.');
    }

    const legacyRecipeIds = normalizePositiveIntegerList(draft.legacyRecipeIds);
    if (legacyRecipeIds.length === 0) {
        throw new Error('legacyRecipeIds deve conter ao menos um legacyRecipeId válido.');
    }

    const rawPrimaryLegacyRecipeId = draft.primaryLegacyRecipeId;
    const primaryLegacyRecipeId = rawPrimaryLegacyRecipeId == null ? null : toPositiveInteger(rawPrimaryLegacyRecipeId);
    if (rawPrimaryLegacyRecipeId != null && primaryLegacyRecipeId == null) {
        throw new Error('primaryLegacyRecipeId precisa ser um inteiro positivo ou null.');
    }
    if (primaryLegacyRecipeId != null && !legacyRecipeIds.includes(primaryLegacyRecipeId)) {
        throw new Error('primaryLegacyRecipeId precisa existir dentro de legacyRecipeIds.');
    }

    const seenSlotIndexes = new Set();
    const slots = Array.isArray(draft.slots)
        ? draft.slots.map((slot) => {
            const index = toNonNegativeInteger(slot?.index);
            if (index == null) {
                throw new Error('Cada slot precisa ter um index inteiro maior ou igual a zero.');
            }
            if (seenSlotIndexes.has(index)) {
                throw new Error(`Slot duplicado no índice ${index}.`);
            }
            seenSlotIndexes.add(index);

            const slotKey = normalizeString(slot?.slotKey);
            if (!slotKey) {
                throw new Error(`slotKey é obrigatório para o slot ${index}.`);
            }

            const defaultItemId = slot?.defaultItemId == null ? null : toPositiveInteger(slot.defaultItemId);
            const defaultQuantity = slot?.defaultQuantity == null ? null : toPositiveInteger(slot.defaultQuantity);
            if ((defaultItemId == null) !== (defaultQuantity == null)) {
                throw new Error(`defaultItemId e defaultQuantity devem ser preenchidos juntos no slot ${index}.`);
            }

            return {
                index,
                slotKey,
                label: normalizeNullableString(slot?.label),
                defaultItemId,
                defaultQuantity,
            };
        }).sort((left, right) => left.index - right.index)
        : [];

    return {
        canonicalKey,
        legacyRecipeIds,
        primaryLegacyRecipeId,
        nameOverride: normalizeNullableString(draft.nameOverride),
        notes: normalizeNullableString(draft.notes),
        slots,
    };
}

function parseRecipeCurationDraft(rawDraft) {
    let parsed;
    try {
        parsed = JSON.parse(String(rawDraft ?? ''));
    } catch {
        throw new Error('Draft JSON inválido.');
    }

    return normalizeRecipeCurationDraft(parsed);
}

function buildRecipeCurationDraft({ canonicalKey, craftName, variants, slots, currentCuration }) {
    const normalizedCurrentCuration = normalizeRecipeCurationRecord(currentCuration);
    const fallbackLegacyRecipeIds = Array.from(new Set(
        variants
            .map((variant) => variant.legacyRecipeId)
            .filter((value) => typeof value === 'number' && Number.isInteger(value) && value > 0),
    )).sort((left, right) => left - right);

    const primaryLegacyRecipeId = normalizedCurrentCuration?.primaryLegacyRecipeId
        ?? variants.find((variant) => variant.isPrimary)?.legacyRecipeId
        ?? fallbackLegacyRecipeIds[0]
        ?? null;
    const curatedSlots = new Map((normalizedCurrentCuration?.slots ?? []).map((slot) => [slot.index, slot]));

    return normalizeRecipeCurationDraft({
        canonicalKey,
        legacyRecipeIds: normalizedCurrentCuration?.legacyRecipeIds?.length
            ? normalizedCurrentCuration.legacyRecipeIds
            : fallbackLegacyRecipeIds,
        primaryLegacyRecipeId,
        nameOverride: normalizedCurrentCuration?.nameOverride ?? null,
        notes: normalizedCurrentCuration?.notes ?? `Curadoria inicial para ${craftName}`,
        slots: [...slots]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((slot) => {
                const curatedSlot = curatedSlots.get(slot.sortOrder);
                const defaultOption = slot.options.find((option) => option.isDefault) ?? slot.options[0] ?? null;

                return {
                    index: slot.sortOrder,
                    slotKey: normalizeString(curatedSlot?.slotKey) || slot.slotKey,
                    label: curatedSlot?.label ?? slot.label ?? null,
                    defaultItemId: curatedSlot?.defaultItemId ?? defaultOption?.itemId ?? null,
                    defaultQuantity: curatedSlot?.defaultQuantity ?? defaultOption?.quantity ?? null,
                };
            }),
    });
}

function serializeRecipeCurationDraft(draft) {
    return JSON.stringify(normalizeRecipeCurationDraft(draft), null, 2);
}

function buildCurationMap(records) {
    const map = new Map();
    for (const record of Array.isArray(records) ? records : []) {
        const normalized = normalizeRecipeCurationRecord(record);
        if (normalized?.canonicalKey) {
            map.set(normalized.canonicalKey, normalized);
        }
    }
    return map;
}

function mergeRecipeCurations({ jsonRecords = [], dbRecords = [] } = {}) {
    const jsonByCanonicalKey = buildCurationMap(jsonRecords);
    const dbByCanonicalKey = buildCurationMap(dbRecords);
    const effectiveByCanonicalKey = new Map(jsonByCanonicalKey);
    const sourceByCanonicalKey = new Map(Array.from(jsonByCanonicalKey.keys()).map((key) => [key, 'json']));

    for (const [canonicalKey, curation] of dbByCanonicalKey.entries()) {
        effectiveByCanonicalKey.set(canonicalKey, curation);
        sourceByCanonicalKey.set(canonicalKey, 'db');
    }

    return {
        jsonByCanonicalKey,
        dbByCanonicalKey,
        effectiveByCanonicalKey,
        sourceByCanonicalKey,
    };
}

module.exports = {
    buildRecipeCurationDraft,
    mergeRecipeCurations,
    normalizeRecipeCurationDraft,
    normalizeRecipeCurationRecord,
    normalizeRecipeCurationSearchTerm,
    normalizeRecipeCurationTypeFilter,
    parseRecipeCurationDraft,
    serializeRecipeCurationDraft,
};
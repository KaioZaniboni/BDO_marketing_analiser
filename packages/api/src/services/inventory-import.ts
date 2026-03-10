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

export interface InventoryImportPreviewRow {
    rawName: string;
    normalizedName: string;
    quantity: number;
    status: 'matched' | 'ambiguous' | 'unmatched';
    matchedItemId: number | null;
    candidates: InventoryImportItemCandidate[];
}

interface InventoryItemLookup {
    id: number;
    name: string;
    iconUrl: string | null;
    grade: number;
}

const MIN_MATCH_SCORE = 0.45;
const STRONG_MATCH_SCORE = 0.84;
const CONFIDENT_GAP_SCORE = 0.12;

export function normalizeInventoryImportName(value: string): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function tokenizeInventoryImportName(value: string): string[] {
    return normalizeInventoryImportName(value)
        .split(' ')
        .filter((token) => token.length >= 2);
}

export function scoreInventoryImportItemMatch(inputName: string, candidateName: string): number {
    const normalizedInput = normalizeInventoryImportName(inputName);
    const normalizedCandidate = normalizeInventoryImportName(candidateName);

    if (!normalizedInput || !normalizedCandidate) {
        return 0;
    }

    if (normalizedInput === normalizedCandidate) {
        return 1;
    }

    const inputTokens = tokenizeInventoryImportName(normalizedInput);
    const candidateTokens = tokenizeInventoryImportName(normalizedCandidate);
    if (inputTokens.length === 0 || candidateTokens.length === 0) {
        return 0;
    }

    let matchedTokens = 0;
    let prefixTokens = 0;
    const usedCandidateTokens = new Set<number>();

    for (const inputToken of inputTokens) {
        const candidateIndex = candidateTokens.findIndex((candidateToken, index) => {
            if (usedCandidateTokens.has(index)) {
                return false;
            }

            return candidateToken === inputToken
                || candidateToken.includes(inputToken)
                || inputToken.includes(candidateToken);
        });

        if (candidateIndex === -1) {
            continue;
        }

        matchedTokens += 1;
        usedCandidateTokens.add(candidateIndex);

        const candidateToken = candidateTokens[candidateIndex];
        if (candidateToken.startsWith(inputToken) || inputToken.startsWith(candidateToken)) {
            prefixTokens += 1;
        }
    }

    const inputCoverage = matchedTokens / inputTokens.length;
    const candidateCoverage = matchedTokens / candidateTokens.length;
    const prefixCoverage = prefixTokens / inputTokens.length;
    const containsBonus = normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate)
        ? 0.18
        : 0;
    const startsWithBonus = normalizedCandidate.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedCandidate)
        ? 0.08
        : 0;
    const lengthPenalty = Math.min(
        Math.abs(normalizedCandidate.length - normalizedInput.length) / Math.max(normalizedCandidate.length, normalizedInput.length),
        1,
    );

    const rawScore = (inputCoverage * 0.52)
        + (candidateCoverage * 0.18)
        + (prefixCoverage * 0.18)
        + containsBonus
        + startsWithBonus
        - (lengthPenalty * 0.16);

    return Math.max(0, Math.min(1, rawScore));
}

export function buildInventoryImportPreview(
    entries: InventoryImportEntryInput[],
    items: InventoryItemLookup[],
): InventoryImportPreviewRow[] {
    return entries.map((entry) => {
        const normalizedName = normalizeInventoryImportName(entry.rawName);
        const scoredCandidates = items
            .map((item) => ({
                id: item.id,
                name: item.name,
                iconUrl: item.iconUrl,
                grade: item.grade,
                score: scoreInventoryImportItemMatch(entry.rawName, item.name),
            }))
            .filter((item) => item.score >= MIN_MATCH_SCORE)
            .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name) || left.id - right.id)
            .slice(0, 5);

        const [topCandidate, nextCandidate] = scoredCandidates;
        let status: InventoryImportPreviewRow['status'] = 'unmatched';
        let matchedItemId: number | null = null;

        if (topCandidate) {
            const hasConfidentGap = !nextCandidate || (topCandidate.score - nextCandidate.score) >= CONFIDENT_GAP_SCORE;
            if (topCandidate.score >= 0.96 || (topCandidate.score >= STRONG_MATCH_SCORE && hasConfidentGap)) {
                status = 'matched';
                matchedItemId = topCandidate.id;
            } else {
                status = 'ambiguous';
            }
        }

        return {
            rawName: entry.rawName,
            normalizedName,
            quantity: entry.quantity,
            status,
            matchedItemId,
            candidates: scoredCandidates,
        };
    });
}
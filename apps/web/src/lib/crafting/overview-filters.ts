import type { RecipeOverviewRow } from './calculator';

export interface OverviewFiltersState {
    minSilverPerHour: string;
    minDailyVolume: string;
    favoritesOnly: boolean;
}

export function parseOptionalMinimumFilter(value: string): number | null {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
        return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function matchesOverviewFilters(
    row: RecipeOverviewRow,
    searchTerm: string,
    filters: OverviewFiltersState,
): boolean {
    const minSilverPerHour = parseOptionalMinimumFilter(filters.minSilverPerHour);
    const minDailyVolume = parseOptionalMinimumFilter(filters.minDailyVolume);
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesSearch = normalizedSearch.length === 0
        || row.name.toLowerCase().includes(normalizedSearch)
        || row.possibleInputs.some((input) => input.toLowerCase().includes(normalizedSearch));

    if (!matchesSearch) {
        return false;
    }

    if (filters.favoritesOnly && !row.favorite) {
        return false;
    }

    if (minSilverPerHour !== null && row.silverPerHour < minSilverPerHour) {
        return false;
    }

    if (minDailyVolume !== null && row.dailyVolume < minDailyVolume) {
        return false;
    }

    return true;
}
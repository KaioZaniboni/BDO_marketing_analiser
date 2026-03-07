import { describe, expect, it } from 'vitest';
import { matchesOverviewFilters, parseOptionalMinimumFilter } from './overview-filters';
import type { RecipeOverviewRow } from './calculator';

function createRow(overrides: Partial<RecipeOverviewRow> = {}): RecipeOverviewRow {
    return {
        id: 1,
        name: 'Beer',
        recipe: {} as RecipeOverviewRow['recipe'],
        possibleInputs: ['Grain'],
        marketPrice: 1_000,
        silverPerHour: -500,
        priceChange: null,
        dailyVolume: 0,
        volumeChange: null,
        experience: 100,
        favorite: false,
        ...overrides,
    };
}

describe('overview filters', () => {
    it('treats empty minimum fields as no filter', () => {
        const row = createRow({ silverPerHour: -1_000, dailyVolume: 0 });

        expect(matchesOverviewFilters(row, '', {
            minSilverPerHour: '',
            minDailyVolume: '',
            favoritesOnly: false,
        })).toBe(true);
    });

    it('applies a zero minimum only when the user explicitly enters 0', () => {
        const row = createRow({ silverPerHour: -1 });

        expect(matchesOverviewFilters(row, '', {
            minSilverPerHour: '0',
            minDailyVolume: '',
            favoritesOnly: false,
        })).toBe(false);
    });

    it('parses optional minimum values consistently', () => {
        expect(parseOptionalMinimumFilter('')).toBeNull();
        expect(parseOptionalMinimumFilter('   ')).toBeNull();
        expect(parseOptionalMinimumFilter('0')).toBe(0);
        expect(parseOptionalMinimumFilter('2500')).toBe(2500);
    });
});
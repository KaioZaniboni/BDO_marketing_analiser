'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ImperialTierKey, ImperialType } from '@bdo/api';

export type ImperialSortField = 'profit' | 'roi' | 'volume' | 'tier';
export type ImperialSortDirection = 'asc' | 'desc';
export type ImperialItemKindFilter = 'all' | 'result' | 'proc';

export interface ImperialPagePreferences {
    tier: ImperialTierKey | 'ALL';
    minimumProfit: number;
    itemKind: ImperialItemKindFilter;
    showOnlyFavorites: boolean;
    showOnlyBestImperial: boolean;
    sortBy: ImperialSortField;
    sortDirection: ImperialSortDirection;
}

interface ImperialPreferencesState {
    pages: Record<ImperialType, ImperialPagePreferences>;
    setPreferences: (type: ImperialType, next: Partial<ImperialPagePreferences>) => void;
    resetPreferences: (type: ImperialType) => void;
}

const DEFAULT_PAGE_PREFERENCES: ImperialPagePreferences = {
    tier: 'ALL',
    minimumProfit: 0,
    itemKind: 'all',
    showOnlyFavorites: false,
    showOnlyBestImperial: false,
    sortBy: 'profit',
    sortDirection: 'desc',
};

function createDefaultPages(): Record<ImperialType, ImperialPagePreferences> {
    return {
        cooking: { ...DEFAULT_PAGE_PREFERENCES },
        alchemy: { ...DEFAULT_PAGE_PREFERENCES },
    };
}

export const useImperialPreferencesStore = create<ImperialPreferencesState>()(
    persist(
        (set) => ({
            pages: createDefaultPages(),
            setPreferences: (type, next) => set((state) => ({
                pages: {
                    ...state.pages,
                    [type]: {
                        ...state.pages[type],
                        ...next,
                    },
                },
            })),
            resetPreferences: (type) => set((state) => ({
                pages: {
                    ...state.pages,
                    [type]: { ...DEFAULT_PAGE_PREFERENCES },
                },
            })),
        }),
        {
            name: 'bdo-imperial-preferences',
        },
    ),
);

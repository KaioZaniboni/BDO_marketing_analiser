'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultCalculatorState, type CraftingCalculatorState } from '@/lib/crafting/calculator';

interface CraftingCalculatorActions {
    toggleFavorite: (type: 'cooking' | 'alchemy', recipeId: number) => void;
    setCustomPrice: (itemId: number, value: number | null) => void;
    toggleTaxedItem: (itemId: number) => void;
    toggleKeptItem: (itemId: number) => void;
    setCraftQuantity: (recipeId: number, value: number) => void;
    setSelectedMaterial: (recipeId: number, slotIndex: number, itemId: number) => void;
    toggleRareProc: (recipeId: number) => void;
    toggleSlowCook: (recipeId: number) => void;
    toggleCollapsed: (recipeId: number) => void;
    resetFlags: () => void;
}

type CraftingCalculatorStore = CraftingCalculatorState & CraftingCalculatorActions;
export type { CraftingCalculatorStore };

const toggleNumber = (values: number[], value: number): number[] => (
    values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value]
);

export const useCraftingCalculatorStore = create<CraftingCalculatorStore>()(
    persist(
        (set) => ({
            ...getDefaultCalculatorState(),
            toggleFavorite: (type, recipeId) => set((state) => ({
                favoriteIds: {
                    ...state.favoriteIds,
                    [type]: toggleNumber(state.favoriteIds[type], recipeId),
                },
            })),
            setCustomPrice: (itemId, value) => set((state) => {
                const next = { ...state.customPrices };
                if (value === null || Number.isNaN(value)) {
                    delete next[itemId];
                } else {
                    next[itemId] = Math.max(value, 0);
                }
                return { customPrices: next };
            }),
            toggleTaxedItem: (itemId) => set((state) => ({ taxedItemIds: toggleNumber(state.taxedItemIds, itemId) })),
            toggleKeptItem: (itemId) => set((state) => ({ keptItemIds: toggleNumber(state.keptItemIds, itemId) })),
            setCraftQuantity: (recipeId, value) => set((state) => ({
                craftQuantities: {
                    ...state.craftQuantities,
                    [recipeId]: Math.max(value, 1),
                },
            })),
            setSelectedMaterial: (recipeId, slotIndex, itemId) => set((state) => ({
                selectedMaterials: {
                    ...state.selectedMaterials,
                    [recipeId]: {
                        ...state.selectedMaterials[recipeId],
                        [slotIndex]: itemId,
                    },
                },
            })),
            toggleRareProc: (recipeId) => set((state) => ({ useRareProcIds: toggleNumber(state.useRareProcIds, recipeId) })),
            toggleSlowCook: (recipeId) => set((state) => ({ slowCookedIds: toggleNumber(state.slowCookedIds, recipeId) })),
            toggleCollapsed: (recipeId) => set((state) => ({ collapsedIds: toggleNumber(state.collapsedIds, recipeId) })),
            resetFlags: () => set(() => getDefaultCalculatorState()),
        }),
        {
            name: 'bdo-crafting-calculator',
        },
    ),
);

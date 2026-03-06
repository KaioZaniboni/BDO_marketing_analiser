'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CRAFTING_SETTINGS } from '@/lib/crafting/constants';

export interface GlobalSettings {
    hasValuePack: boolean;
    hasMerchantRing: boolean;
    familyFame: number;
    familyFameBonus: number;
    cookingMastery: number;
    speedCookingMastery: number;
    slowCookingMastery: number;
    alchemyMastery: number;
    processingMastery: number;
    gatheringMastery: number;
    cookTimeSeconds: number;
    speedCookingTime: number;
    slowCookingTime: number;
    alchemyTimeSeconds: number;
    cookingByproductUsage: number;
    alchemyByproductUsage: number;
    weight: number;
    usedWeight: number;
    setValuePack: (value: boolean) => void;
    setMerchantRing: (value: boolean) => void;
    setFamilyFame: (value: number) => void;
    setFamilyFameBonus: (value: number) => void;
    setCookingMastery: (value: number) => void;
    setSpeedCookingMastery: (value: number) => void;
    setSlowCookingMastery: (value: number) => void;
    setAlchemyMastery: (value: number) => void;
    setProcessingMastery: (value: number) => void;
    setGatheringMastery: (value: number) => void;
    setCookTimeSeconds: (value: number) => void;
    setSpeedCookingTime: (value: number) => void;
    setSlowCookingTime: (value: number) => void;
    setAlchemyTimeSeconds: (value: number) => void;
    setCookingByproductUsage: (value: number) => void;
    setAlchemyByproductUsage: (value: number) => void;
    setWeight: (value: number) => void;
    setUsedWeight: (value: number) => void;
}

const toFamilyFameBonus = (value: number): number => Math.min(Math.max(value, 0) / 400_000, 0.005);
const toFamilyFame = (value: number): number => Math.round(Math.max(value, 0) * 400_000);

export const useGlobalSettings = create<GlobalSettings>()(
    persist(
        (set) => ({
            hasValuePack: DEFAULT_CRAFTING_SETTINGS.valuePackActive,
            hasMerchantRing: DEFAULT_CRAFTING_SETTINGS.merchantRingActive,
            familyFame: toFamilyFame(DEFAULT_CRAFTING_SETTINGS.familyFameBonus),
            familyFameBonus: DEFAULT_CRAFTING_SETTINGS.familyFameBonus,
            cookingMastery: DEFAULT_CRAFTING_SETTINGS.speedCookingMastery,
            speedCookingMastery: DEFAULT_CRAFTING_SETTINGS.speedCookingMastery,
            slowCookingMastery: DEFAULT_CRAFTING_SETTINGS.slowCookingMastery,
            alchemyMastery: DEFAULT_CRAFTING_SETTINGS.alchemyMastery,
            processingMastery: 0,
            gatheringMastery: 0,
            cookTimeSeconds: DEFAULT_CRAFTING_SETTINGS.speedCookingTime,
            speedCookingTime: DEFAULT_CRAFTING_SETTINGS.speedCookingTime,
            slowCookingTime: DEFAULT_CRAFTING_SETTINGS.slowCookingTime,
            alchemyTimeSeconds: DEFAULT_CRAFTING_SETTINGS.alchemyTime,
            cookingByproductUsage: DEFAULT_CRAFTING_SETTINGS.cookingByproductUsage,
            alchemyByproductUsage: DEFAULT_CRAFTING_SETTINGS.alchemyByproductUsage,
            weight: DEFAULT_CRAFTING_SETTINGS.weight,
            usedWeight: DEFAULT_CRAFTING_SETTINGS.usedWeight,
            setValuePack: (value) => set({ hasValuePack: value }),
            setMerchantRing: (value) => set({ hasMerchantRing: value }),
            setFamilyFame: (value) => set({
                familyFame: Math.max(value, 0),
                familyFameBonus: toFamilyFameBonus(value),
            }),
            setFamilyFameBonus: (value) => set({
                familyFameBonus: Math.max(value, 0),
                familyFame: toFamilyFame(value),
            }),
            setCookingMastery: (value) => set({
                cookingMastery: Math.max(value, 0),
                speedCookingMastery: Math.max(value, 0),
            }),
            setSpeedCookingMastery: (value) => set({
                cookingMastery: Math.max(value, 0),
                speedCookingMastery: Math.max(value, 0),
            }),
            setSlowCookingMastery: (value) => set({ slowCookingMastery: Math.max(value, 0) }),
            setAlchemyMastery: (value) => set({ alchemyMastery: Math.max(value, 0) }),
            setProcessingMastery: (value) => set({ processingMastery: Math.max(value, 0) }),
            setGatheringMastery: (value) => set({ gatheringMastery: Math.max(value, 0) }),
            setCookTimeSeconds: (value) => set({
                cookTimeSeconds: Math.max(value, 0.1),
                speedCookingTime: Math.max(value, 0.1),
            }),
            setSpeedCookingTime: (value) => set({
                cookTimeSeconds: Math.max(value, 0.1),
                speedCookingTime: Math.max(value, 0.1),
            }),
            setSlowCookingTime: (value) => set({ slowCookingTime: Math.max(value, 0.1) }),
            setAlchemyTimeSeconds: (value) => set({ alchemyTimeSeconds: Math.max(value, 0.1) }),
            setCookingByproductUsage: (value) => set({ cookingByproductUsage: Math.max(value, 0) }),
            setAlchemyByproductUsage: (value) => set({ alchemyByproductUsage: Math.max(value, 0) }),
            setWeight: (value) => set({ weight: Math.max(value, 0) }),
            setUsedWeight: (value) => set({ usedWeight: Math.max(value, 0) }),
        }),
        {
            name: 'bdo-global-settings',
        },
    ),
);

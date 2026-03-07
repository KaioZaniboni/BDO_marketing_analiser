import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from './CraftingRecipeSidebarSections';

const { mockUseGlobalSettings } = vi.hoisted(() => {
    const state = {
        hasValuePack: true,
        hasMerchantRing: true,
        familyFame: 2000,
        familyFameBonus: 0.005,
        cookingMastery: 1000,
        speedCookingMastery: 1000,
        slowCookingMastery: 1500,
        alchemyMastery: 1500,
        processingMastery: 0,
        gatheringMastery: 0,
        cookTimeSeconds: 1.2,
        speedCookingTime: 1.2,
        slowCookingTime: 4.1,
        alchemyTimeSeconds: 1.2,
        cookingByproductUsage: 9065,
        alchemyByproductUsage: 5301,
        weight: 2400,
        usedWeight: 300,
        setValuePack: vi.fn(),
        setMerchantRing: vi.fn(),
        setFamilyFame: vi.fn(),
        setFamilyFameBonus: vi.fn(),
        setCookingMastery: vi.fn(),
        setSpeedCookingMastery: vi.fn(),
        setSlowCookingMastery: vi.fn(),
        setAlchemyMastery: vi.fn(),
        setProcessingMastery: vi.fn(),
        setGatheringMastery: vi.fn(),
        setCookTimeSeconds: vi.fn(),
        setSpeedCookingTime: vi.fn(),
        setSlowCookingTime: vi.fn(),
        setAlchemyTimeSeconds: vi.fn(),
        setCookingByproductUsage: vi.fn(),
        setAlchemyByproductUsage: vi.fn(),
        setWeight: vi.fn(),
        setUsedWeight: vi.fn(),
        reset: vi.fn(),
    };

    return {
        mockUseGlobalSettings: vi.fn(() => state),
    };
});

vi.mock('@/stores/global-settings-store', () => ({
    useGlobalSettings: mockUseGlobalSettings,
}));

describe('SettingsPanel', () => {
    it('renderiza painel compacto de cooking com link para a página completa', () => {
        const html = renderToStaticMarkup(<SettingsPanel type="cooking" />);

        expect(html).toContain('Abrir página completa');
        expect(html).toContain('Taxas e mercado');
        expect(html).toContain('Maestria rápida');
        expect(html).toContain('Item alvo do subproduto');
        expect(html).toContain('Peso e inventário');
    });

    it('renderiza painel compacto de alchemy com os campos corretos', () => {
        const html = renderToStaticMarkup(<SettingsPanel type="alchemy" />);

        expect(html).toContain('Maestria de alquimia');
        expect(html).toContain('Tempo por craft (s)');
        expect(html).toContain('Mysterious Catalyst');
    });
});
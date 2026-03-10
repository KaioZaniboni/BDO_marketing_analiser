import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const {
    mockUseSession,
    mockImperialRankingQuery,
    mockImperialCoverageQuery,
    mockUseGlobalSettings,
    mockUseCraftingCalculatorStore,
    mockUseImperialPreferencesStore,
} = vi.hoisted(() => {
    const favoriteIds = { cooking: [593], alchemy: [] };
    const toggleFavorite = vi.fn();
    const row = {
        coverageKey: '593:9602',
        id: 593,
        name: 'Balenos Meal',
        recipeId: 593,
        recipeName: 'Balenos Meal',
        recipeType: 'cooking',
        resultItemId: 9602,
        targetItemId: 9602,
        targetItemName: 'Balenos Meal Proc',
        targetIconUrl: null,
        targetGrade: 0,
        targetOutputKind: 'proc',
        tierKey: 'GURU',
        tierName: 'Guru',
        tierSortOrder: 6,
        qtyRequired: 8,
        boxName: 'Caixa Imperial de Culinária - Guru',
        boxInfo: {
            tier: { key: 'GURU', name: 'Guru', basePrice: 320000, sortOrder: 6 },
            qtyRequired: 8,
            boxName: 'Caixa Imperial de Culinária - Guru',
        },
        masteryBonusPct: 0.6724,
        baseBoxNpcPrice: 800000,
        imperialBoxPrice: 1337920,
        imperialSalePrice: 1337920,
        marketUnitPrice: 180000,
        marketPurchaseCostPerBox: 1440000,
        marketRevenuePerBox: 1094400,
        marketSaleRevenuePerBox: 1094400,
        costPerCraft: 10000,
        costPerBox: 310559,
        costPerBoxProduced: 310559,
        profitImperialBuying: -102080,
        profitPerBox: 1027361,
        profitImperialProducing: 1027361,
        profitMarketProducing: 783841,
        imperialRoi: 3.307,
        currentStock: 20,
        dailyVolume: 1200,
        expectedOutputPerCraft: 0.2576,
        resultQuantity: 1,
        craftsPerBox: 31.0559,
        craftSecondsPerBox: 27.7,
        actionSeconds: 1.2,
        massProcRate: 1.3399,
        bestSaleChannel: 'imperial',
        bestImperialAcquisition: 'produce',
        ingredientsPerBox: [
            {
                itemId: 30,
                name: 'Ingredient 30',
                quantity: 310.5,
                unitPrice: 1000,
                totalCost: 310559,
                source: 'market',
                iconUrl: null,
                grade: 0,
            },
        ],
    };

    return {
        mockUseSession: vi.fn(),
        mockImperialRankingQuery: vi.fn(() => ({ data: [row], isLoading: false })),
        mockImperialCoverageQuery: vi.fn(() => ({ data: [{ coverageKey: '593:9602', recipeId: 593, targetItemId: 9602, maxBoxesFromInventory: 3, inventoryCoveragePct: 100, missingIngredients: [] }] })),
        mockUseGlobalSettings: vi.fn(() => ({
            cookingMastery: 1000,
            alchemyMastery: 1500,
            speedCookingTime: 1.2,
            alchemyTimeSeconds: 1.1,
            hasValuePack: true,
            hasMerchantRing: false,
            familyFame: 200000,
        })),
        mockUseCraftingCalculatorStore: vi.fn((selector: (state: unknown) => unknown) => selector({ favoriteIds, toggleFavorite })),
        mockUseImperialPreferencesStore: vi.fn((selector: (state: unknown) => unknown) => selector({
            pages: {
                cooking: {
                    tier: 'ALL',
                    minimumProfit: 0,
                    itemKind: 'all',
                    showOnlyFavorites: false,
                    showOnlyBestImperial: false,
                    sortBy: 'profit',
                    sortDirection: 'desc',
                },
                alchemy: {
                    tier: 'ALL',
                    minimumProfit: 0,
                    itemKind: 'all',
                    showOnlyFavorites: false,
                    showOnlyBestImperial: false,
                    sortBy: 'profit',
                    sortDirection: 'desc',
                },
            },
            setPreferences: vi.fn(),
            resetPreferences: vi.fn(),
        })),
    };
});

vi.mock('next-auth/react', () => ({
    useSession: mockUseSession,
}));

vi.mock('@/lib/trpc', () => ({
    trpc: {
        recipe: {
            getImperialRanking: { useQuery: mockImperialRankingQuery },
            getImperialInventoryCoverage: { useQuery: mockImperialCoverageQuery },
        },
    },
}));

vi.mock('@/stores/global-settings-store', () => ({
    useGlobalSettings: mockUseGlobalSettings,
}));

vi.mock('@/stores/crafting-calculator-store', () => ({
    useCraftingCalculatorStore: mockUseCraftingCalculatorStore,
}));

vi.mock('@/stores/imperial-preferences-store', () => ({
    useImperialPreferencesStore: mockUseImperialPreferencesStore,
}));

import { ImperialDeliveryPage } from './ImperialDeliveryPage';

describe('ImperialDeliveryPage', () => {
    it('renderiza ranking, filtros e breakdown compartilhado', () => {
        mockUseSession.mockReturnValue({ data: { user: { name: 'Kaio' } }, status: 'authenticated' });

        const html = renderToStaticMarkup(<ImperialDeliveryPage type="cooking" />);

        expect(html).toContain('Culinária Imperial');
        expect(html).toContain('Lucro mínimo');
        expect(html).toContain('Somente favoritos');
        expect(html).toContain('Balenos Meal Proc');
        expect(html).toContain('Caixa Imperial de Culinária - Guru');
        expect(html).toContain('Ingredientes por caixa');
        expect(html).toContain('3 caixas do inventário');
    });

    it('mostra CTA de login para cobertura quando a sessão não existe', () => {
        mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

        const html = renderToStaticMarkup(<ImperialDeliveryPage type="cooking" />);

        expect(html).toContain('/login?callbackUrl=%2Fcooking%2Fimperial');
        expect(html).toContain('Entrar para ver cobertura');
    });
});

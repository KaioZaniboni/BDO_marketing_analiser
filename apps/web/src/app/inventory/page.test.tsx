import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const {
    mockUseSession,
    mockInventoryListQuery,
    mockInventorySummaryQuery,
    mockInventoryOcrHistoryQuery,
    mockInventoryListImportCatalogQuery,
    mockInventoryUpsertMutation,
    mockInventoryPreviewImportMutation,
    mockInventoryImportFromScreenshotMutation,
    mockInventoryDeleteMutation,
    mockMarketSearchItemsQuery,
    mockUseUtils,
} = vi.hoisted(() => ({
    mockUseSession: vi.fn(),
    mockInventoryListQuery: vi.fn(() => ({ data: [], isLoading: false })),
    mockInventorySummaryQuery: vi.fn(() => ({ data: null })),
    mockInventoryOcrHistoryQuery: vi.fn(() => ({
        data: { items: [], nextCursor: undefined, hasMore: false },
        isLoading: false,
    })),
    mockInventoryListImportCatalogQuery: vi.fn(() => ({
        data: [],
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue({ data: [] }),
    })),
    mockInventoryUpsertMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    mockInventoryPreviewImportMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false, error: null })),
    mockInventoryImportFromScreenshotMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false, error: null })),
    mockInventoryDeleteMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    mockMarketSearchItemsQuery: vi.fn(() => ({ data: [], isFetching: false, refetch: vi.fn() })),
    mockUseUtils: vi.fn(() => ({
        inventory: {
            list: { invalidate: vi.fn() },
            listOcrImportHistory: { invalidate: vi.fn() },
            summary: { invalidate: vi.fn() },
        },
    })),
}));

vi.mock('next-auth/react', () => ({
    useSession: mockUseSession,
}));

vi.mock('@/lib/trpc', () => ({
    trpc: {
        useUtils: mockUseUtils,
        inventory: {
            list: { useQuery: mockInventoryListQuery },
            summary: { useQuery: mockInventorySummaryQuery },
            listOcrImportHistory: { useQuery: mockInventoryOcrHistoryQuery },
            listImportCatalog: { useQuery: mockInventoryListImportCatalogQuery },
            upsert: { useMutation: mockInventoryUpsertMutation },
            previewImport: { useMutation: mockInventoryPreviewImportMutation },
            importFromScreenshot: { useMutation: mockInventoryImportFromScreenshotMutation },
            delete: { useMutation: mockInventoryDeleteMutation },
        },
        market: {
            searchItems: { useQuery: mockMarketSearchItemsQuery },
        },
    },
}));

import InventoryPage from './page';

describe('InventoryPage', () => {
    it('degrada com CTA de login quando o usuário está anônimo', () => {
        mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

        const html = renderToStaticMarkup(<InventoryPage />);

        expect(html).toContain('O inventário agora usa sessão real.');
        expect(html).toContain('/login?callbackUrl=%2Finventory');
        expect(mockInventoryListQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false, retry: false }));
        expect(mockInventorySummaryQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false, retry: false }));
        expect(mockInventoryOcrHistoryQuery).toHaveBeenCalledWith({ limit: 20 }, expect.objectContaining({ enabled: false, retry: false }));
    });

    it('renderiza o painel de importação por screenshot para usuário autenticado', () => {
        mockUseSession.mockReturnValue({
            data: { user: { username: 'Black' } },
            status: 'authenticated',
        });
        mockInventorySummaryQuery.mockReturnValue({ data: { totalValue: 123456 } });
        mockInventoryOcrHistoryQuery.mockReturnValue({
            data: { items: [{ id: 7 }], nextCursor: undefined, hasMore: false },
            isLoading: false,
        });

        const html = renderToStaticMarkup(<InventoryPage />);

        expect(html).toContain('Importar por screenshot');
        expect(html).toContain('OCR + revisão');
        expect(html).toContain('V2 ícone');
        expect(html).toContain('Sessão ativa: Black');
        expect(html).toContain('123.456');
        expect(html).toContain('Histórico OCR');
        expect(mockInventoryOcrHistoryQuery).toHaveBeenCalledWith({ limit: 20 }, expect.objectContaining({ enabled: true, retry: false }));
        expect(mockInventoryListImportCatalogQuery).toHaveBeenCalledWith(
            { limit: 2500 },
            expect.objectContaining({ enabled: false, retry: false }),
        );
    });
});
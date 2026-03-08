import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const {
    mockUseSession,
    mockInventoryListQuery,
    mockInventorySummaryQuery,
    mockInventoryUpsertMutation,
    mockInventoryDeleteMutation,
    mockUseUtils,
} = vi.hoisted(() => ({
    mockUseSession: vi.fn(),
    mockInventoryListQuery: vi.fn(() => ({ data: [], isLoading: false })),
    mockInventorySummaryQuery: vi.fn(() => ({ data: null })),
    mockInventoryUpsertMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    mockInventoryDeleteMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    mockUseUtils: vi.fn(() => ({
        inventory: {
            list: { invalidate: vi.fn() },
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
            upsert: { useMutation: mockInventoryUpsertMutation },
            delete: { useMutation: mockInventoryDeleteMutation },
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
    });
});
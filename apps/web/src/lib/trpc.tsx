'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@bdo/api';

/**
 * Client tRPC tipado — infere automaticamente os tipos do AppRouter.
 */
export const trpc = createTRPCReact<AppRouter>();
const MARKET_QUERY_REFETCH_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Provider que configura tRPC + TanStack Query para toda a aplicação.
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minuto
                        refetchInterval: MARKET_QUERY_REFETCH_INTERVAL_MS,
                        refetchIntervalInBackground: true,
                        refetchOnReconnect: true,
                        refetchOnWindowFocus: true,
                    },
                },
            }),
    );

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    transformer: superjson,
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}

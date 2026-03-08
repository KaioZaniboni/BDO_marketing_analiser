'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc';

export function AppProviders({ children, session }: { children: React.ReactNode; session: Session | null }) {
    return (
        <SessionProvider session={session}>
            <TRPCProvider>{children}</TRPCProvider>
        </SessionProvider>
    );
}
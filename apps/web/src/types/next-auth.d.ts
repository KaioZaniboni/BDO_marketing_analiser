import type { DefaultSession } from 'next-auth';
import type { AppRole } from '@/lib/auth/roles';

declare module 'next-auth' {
    interface Session {
        user: DefaultSession['user'] & {
            id: string;
            username: string;
            role: AppRole;
        };
    }

    interface User {
        id: string;
        username: string;
        role: AppRole;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        userId?: number;
        username?: string;
        role?: AppRole;
    }
}
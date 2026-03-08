import 'server-only';
import { Role, prisma, verifyPassword } from '@bdo/db';
import type { Context } from '@bdo/api';
import { redirect } from 'next/navigation';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import { APP_ROLES, type AppRole } from '@/lib/auth/roles';

const credentialsSchema = z.object({
    usernameOrEmail: z.string().trim().min(1),
    password: z.string().min(1),
});

function resolveAuthSecret() {
    return process.env.NEXTAUTH_SECRET
        ?? (process.env.NODE_ENV === 'production' ? undefined : 'bdo-market-analyzer-local-dev-secret');
}

function buildLoginHref(callbackUrl: string) {
    const params = new URLSearchParams({ callbackUrl });
    return `/login?${params.toString()}`;
}

function mapDatabaseRole(role: Role): AppRole {
    return role === Role.ADMIN ? APP_ROLES.ADMIN : APP_ROLES.USER;
}

const authSecret = resolveAuthSecret();

export const authOptions: NextAuthOptions = {
    secret: authSecret,
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                usernameOrEmail: { label: 'Usuário ou e-mail', type: 'text' },
                password: { label: 'Senha', type: 'password' },
            },
            authorize: async (credentials) => {
                const parsedCredentials = credentialsSchema.safeParse(credentials);

                if (!parsedCredentials.success) {
                    return null;
                }

                const { usernameOrEmail, password } = parsedCredentials.data;
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: { equals: usernameOrEmail, mode: 'insensitive' } },
                            { username: { equals: usernameOrEmail, mode: 'insensitive' } },
                        ],
                    },
                });

                if (!user || !verifyPassword(password, user.passwordHash)) {
                    return null;
                }

                return {
                    id: String(user.id),
                    name: user.username,
                    email: user.email,
                    username: user.username,
                    role: mapDatabaseRole(user.role),
                };
            },
        }),
    ],
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user) {
                token.userId = Number(user.id);
                token.username = user.username;
                token.role = user.role;
            }

            return token;
        },
        session: async ({ session, token }) => {
            if (!session.user || !token.userId || !token.username || !token.role) {
                return session;
            }

            session.user.id = String(token.userId);
            session.user.username = token.username;
            session.user.name = token.username;
            session.user.role = token.role;
            return session;
        },
    },
};

export async function getServerAuthSession() {
    if (!authSecret && process.env.NODE_ENV === 'production') {
        throw new Error('NEXTAUTH_SECRET não configurado para produção.');
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.username || !session.user.role) {
        return null;
    }

    return session;
}

export async function getTrpcSession(): Promise<Context['session']> {
    const session = await getServerAuthSession();

    if (!session) {
        return null;
    }

    return {
        userId: Number(session.user.id),
        username: session.user.username,
        role: session.user.role === APP_ROLES.ADMIN ? Role.ADMIN : Role.USER,
    };
}

export async function requireAuthSession(callbackUrl: string) {
    const session = await getServerAuthSession();

    if (!session) {
        redirect(buildLoginHref(callbackUrl));
    }

    return session;
}

export async function requireAdminSession(callbackUrl: string) {
    const session = await requireAuthSession(callbackUrl);

    if (session.user.role !== APP_ROLES.ADMIN) {
        redirect('/unauthorized');
    }

    return session;
}
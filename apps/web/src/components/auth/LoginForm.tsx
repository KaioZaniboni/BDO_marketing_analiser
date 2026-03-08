'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LockKeyhole } from 'lucide-react';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
    const router = useRouter();
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        const result = await signIn('credentials', {
            usernameOrEmail,
            password,
            callbackUrl,
            redirect: false,
        });

        setIsSubmitting(false);

        if (!result || result.error) {
            setErrorMessage('Credenciais inválidas. Verifique usuário/e-mail e senha.');
            return;
        }

        router.push(result.url ?? callbackUrl);
        router.refresh();
    };

    return (
        <div className="card w-full p-8">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full bg-gold/15 p-3 text-gold">
                    <LockKeyhole size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-primary">Entrar</h1>
                    <p className="text-sm text-secondary">Acesse recursos protegidos e áreas operacionais.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="usernameOrEmail" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                        Usuário ou e-mail
                    </label>
                    <input
                        id="usernameOrEmail"
                        value={usernameOrEmail}
                        onChange={(event) => setUsernameOrEmail(event.target.value)}
                        className="w-full rounded-lg border border-border bg-bg-hover px-4 py-2.5 text-sm text-primary focus:border-gold focus:outline-none"
                        placeholder="admin ou admin@local.dev"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                        Senha
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-lg border border-border bg-bg-hover px-4 py-2.5 text-sm text-primary focus:border-gold focus:outline-none"
                        placeholder="Sua senha local"
                        required
                    />
                </div>

                {errorMessage && (
                    <div className="rounded-lg border border-loss/30 bg-loss/5 px-4 py-3 text-sm text-secondary">
                        {errorMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-gold px-4 py-2.5 font-semibold text-bg-primary disabled:opacity-60"
                >
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <p className="mt-6 text-xs text-secondary">
                Primeiro acesso local? Crie o primeiro admin com `npm run db:bootstrap-admin`.
            </p>
        </div>
    );
}
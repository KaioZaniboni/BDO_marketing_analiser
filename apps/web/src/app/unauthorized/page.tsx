import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center">
            <div className="card w-full border border-warning/30 bg-warning/5 p-8">
                <h1 className="text-2xl font-bold text-primary">Acesso não autorizado</h1>
                <p className="mt-3 text-sm text-secondary">
                    Sua sessão é válida, mas não possui permissão administrativa para acessar esta área operacional.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/" className="rounded-lg bg-gold px-4 py-2 font-semibold text-bg-primary">
                        Voltar ao dashboard
                    </Link>
                    <Link href="/login?callbackUrl=%2Foperations%2Frecipe-curation" className="rounded-lg border border-border px-4 py-2 font-semibold text-primary">
                        Trocar de usuário
                    </Link>
                </div>
            </div>
        </div>
    );
}
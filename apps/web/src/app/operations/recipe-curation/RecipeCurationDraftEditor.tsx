'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

interface RecipeCurationDraftEditorProps {
    selectedCanonicalKey: string;
    initialDraftJson: string;
}

export function RecipeCurationDraftEditor({
    selectedCanonicalKey,
    initialDraftJson,
}: RecipeCurationDraftEditorProps) {
    const router = useRouter();
    const [draftJson, setDraftJson] = useState(initialDraftJson);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const saveMutation = trpc.recipeCuration.save.useMutation({
        onSuccess: () => {
            setSuccessMessage('Curadoria salva no banco e republicada no craft canônico selecionado.');
            router.refresh();
        },
        onError: () => {
            setSuccessMessage(null);
        },
    });

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSuccessMessage(null);
        saveMutation.mutate({ selectedCanonicalKey, draftJson });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-primary">Editor operacional</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setDraftJson(initialDraftJson);
                            setSuccessMessage(null);
                        }}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary transition hover:border-gold/40 hover:text-primary"
                    >
                        Restaurar draft carregado
                    </button>
                    <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saveMutation.isPending ? 'Salvando...' : 'Salvar no banco'}
                    </button>
                </div>
            </div>

            <textarea
                rows={22}
                value={draftJson}
                onChange={(event) => setDraftJson(event.target.value)}
                className="min-h-[420px] w-full rounded-lg border border-border bg-bg-hover/20 p-4 font-mono text-xs text-primary focus:border-gold focus:outline-none"
            />

            <div className="space-y-2 text-sm text-secondary">
                <p>O save grava somente no banco operacional. O JSON versionado continua como baseline.</p>
                <p>Nesta etapa, a republicação pontual preserva o conjunto atual de <code>legacyRecipeIds</code> do craft selecionado.</p>
            </div>

            {saveMutation.error && (
                <div className="rounded-lg border border-loss/30 bg-loss/5 p-3 text-sm text-secondary">
                    <strong className="text-primary">Falha ao salvar:</strong> {saveMutation.error.message}
                </div>
            )}

            {successMessage && !saveMutation.error && (
                <div className="rounded-lg border border-profit/30 bg-profit/5 p-3 text-sm text-secondary">
                    <strong className="text-primary">Sucesso:</strong> {successMessage}
                </div>
            )}
        </form>
    );
}
'use client';

export function CraftingRecipeLoadingState() {
    return (
        <div className="flex flex-col gap-6">
            <div className="skeleton h-10 w-1/3" />
            <div className="skeleton h-96 w-full" />
        </div>
    );
}

export function CraftingRecipeNotFoundState({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <p className="text-lg text-secondary">Receita não encontrada.</p>
            <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-border bg-bg-hover px-4 py-2 text-primary"
            >
                Voltar
            </button>
        </div>
    );
}
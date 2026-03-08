import Link from 'next/link';
import { FolderCog, Layers3 } from 'lucide-react';
import { getRecipeCurationPageData } from '@/server/recipe-curation';
import { requireAdminSession } from '@/server/auth';
import { RecipeCurationDetailPanels } from './RecipeCurationDetailPanels';

export const dynamic = 'force-dynamic';

type PageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildCraftHref(typeFilter: string, searchTerm: string, craftId: number) {
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== 'all') {
        params.set('type', typeFilter);
    }
    if (searchTerm) {
        params.set('q', searchTerm);
    }
    params.set('craftId', String(craftId));
    return `/operations/recipe-curation?${params.toString()}`;
}

export default async function RecipeCurationPage({ searchParams }: PageProps) {
    await requireAdminSession('/operations/recipe-curation');
    const filters = searchParams ? await searchParams : {};
    const data = await getRecipeCurationPageData(filters);
    const optionUsage = new Map<number, string[]>();

    data.selectedCraft?.variants.forEach((variant) => {
        const label = variant.legacyRecipeId ? `#${variant.legacyRecipeId}` : variant.name;
        variant.slotSelections.forEach((selection) => {
            const current = optionUsage.get(selection.slotOptionId) ?? [];
            current.push(label);
            optionUsage.set(selection.slotOptionId, current);
        });
    });

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-16">
            <div className="flex flex-col gap-2">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <FolderCog size={24} className="text-gold" />
                    Curadoria Operacional de Receitas
                </h1>
                <p className="text-sm text-secondary">
                    Inspecione crafts canônicos, revise variantes/slots e opere a curadoria viva no banco com precedência explícita sobre o baseline versionado.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
                <div className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-secondary">Crafts filtrados</p>
                    <p className="mt-2 text-2xl font-bold text-primary">{data.totalCount}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-secondary">Curadoria efetiva</p>
                    <p className="mt-2 text-2xl font-bold text-primary">{data.effectiveCuratedCraftCount}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-secondary">Overrides no banco</p>
                    <p className="mt-2 text-2xl font-bold text-primary">{data.dbCuratedCraftCount}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-secondary">Baseline JSON</p>
                    <p className="mt-2 text-2xl font-bold text-primary">{data.jsonCuratedCraftCount}</p>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                <div className="card border border-gold/20 bg-gold/5 p-4 text-sm text-secondary">
                    <strong className="text-primary">Fluxo operacional atual:</strong> o save grava no banco, republica imediatamente o craft afetado e mantém o JSON apenas como baseline versionado.
                </div>
                <div className="card p-4">
                    <p className="text-xs uppercase tracking-wide text-secondary">Arquivo baseline versionado</p>
                    <p className="mt-2 break-all font-mono text-sm text-primary">{data.curationFileDisplayPath}</p>
                </div>
            </div>

            <form method="get" className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
                <div className="flex-1">
                    <label htmlFor="q" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">Buscar</label>
                    <input
                        id="q"
                        name="q"
                        defaultValue={data.searchTerm}
                        placeholder="Nome, canonicalKey ou itemId do resultado"
                        className="w-full rounded-lg border border-border bg-bg-hover px-4 py-2.5 text-sm text-primary focus:outline-none focus:border-gold"
                    />
                </div>
                <div className="w-full lg:w-52">
                    <label htmlFor="type" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">Tipo</label>
                    <select
                        id="type"
                        name="type"
                        defaultValue={data.typeFilter}
                        className="w-full rounded-lg border border-border bg-bg-hover px-4 py-2.5 text-sm text-primary focus:outline-none focus:border-gold"
                    >
                        <option value="all">Todos</option>
                        <option value="cooking">Culinária</option>
                        <option value="alchemy">Alquimia</option>
                        <option value="processing">Processamento</option>
                    </select>
                </div>
                <button type="submit" className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-bg-primary">
                    Aplicar filtros
                </button>
            </form>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                <div className="card p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Layers3 size={16} className="text-gold" /> Crafts canônicos
                    </div>
                    <div className="space-y-2">
                        {data.crafts.map((craft) => {
                            const active = craft.id === data.selectedCraft?.id;
                            return (
                                <Link
                                    key={craft.id}
                                    href={buildCraftHref(data.typeFilter, data.searchTerm, craft.id)}
                                    className={`block rounded-lg border p-3 transition-colors ${active ? 'border-gold bg-gold/10' : 'border-border bg-bg-hover/30 hover:border-gold/40'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-primary">{craft.name}</p>
                                            <p className="mt-1 text-xs text-secondary">{craft.canonicalKey}</p>
                                        </div>
                                        <span className="grade-badge grade-white uppercase text-[10px]">{craft.type}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-secondary">
                                        Resultado: {craft.resultQuantity}x {craft.resultItem.name} • {craft.variants.length} variante(s)
                                    </p>
                                </Link>
                            );
                        })}
                        {data.crafts.length === 0 && (
                            <div className="rounded-lg border border-border bg-bg-hover/20 p-4 text-sm text-secondary">
                                Nenhum craft encontrado para o filtro atual.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {data.loadError && (
                        <div className="card border border-loss/30 bg-loss/5 p-4 text-sm text-secondary">
                            <p className="font-semibold text-primary">Modelo canônico indisponível no banco atual.</p>
                            <p className="mt-2">Detalhe técnico: {data.loadError}</p>
                        </div>
                    )}

                    <RecipeCurationDetailPanels data={data} optionUsage={optionUsage} />
                </div>
            </div>
        </div>
    );
}
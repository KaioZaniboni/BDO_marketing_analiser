'use client';

import { resolveBdoIconUrl } from '@/lib/icon-url';
import type { CraftingCalculatorState, LeafInputRow, RecipeTreeNode } from '@/lib/crafting/calculator';
import {
    OUTPUT_KIND_LABEL,
    SOURCE_META,
    SectionHeader,
    SourceBadge,
    SourceDescription,
    formatSilver,
} from './CraftingRecipeDetailShared';

function InputTable({
    inputs,
    state,
    onToggleTaxedItem,
    onSetCustomPrice,
}: {
    inputs: LeafInputRow[];
    state: Pick<CraftingCalculatorState, 'customPrices' | 'taxedItemIds'>;
    onToggleTaxedItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm xl:table-fixed">
                <colgroup>
                    <col />
                    <col style={{ width: '6rem' }} />
                    <col style={{ width: '9rem' }} />
                    <col style={{ width: '7.25rem' }} />
                    <col style={{ width: '4.5rem' }} />
                    <col style={{ width: '8rem' }} />
                </colgroup>
                <thead className="text-xs uppercase text-secondary">
                    <tr>
                        <th className="px-4 py-4 text-left">Material</th>
                        <th className="px-4 py-4 text-right">Qtd</th>
                        <th className="px-4 py-4 text-right">Preço un.</th>
                        <th className="px-4 py-4 text-left">Origem</th>
                        <th className="px-4 py-4 text-center">Taxa</th>
                        <th className="px-4 py-4 text-right">Custo</th>
                    </tr>
                </thead>
                <tbody>
                    {inputs.map((input) => {
                        const inputIconUrl = resolveBdoIconUrl(input.iconUrl);

                        return (
                            <tr key={input.itemId} className="border-t border-border align-top">
                                <td className="px-4 py-4">
                                    <div className="flex items-start gap-4">
                                        {inputIconUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={inputIconUrl} alt={input.name} className="h-10 w-10 rounded-lg border border-border bg-bg-primary" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-lg border border-border bg-bg-primary" />
                                        )}
                                        <div className="space-y-1.5">
                                            <p className="font-medium text-primary">{input.name}</p>
                                            <p className="text-xs text-secondary">Peso {input.weightPerUnit.toFixed(2)} LT</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-primary">{input.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right">
                                    <input
                                        type="number"
                                        value={state.customPrices[input.itemId] ?? input.unitPrice}
                                        onChange={(event) => onSetCustomPrice(input.itemId, Number(event.target.value))}
                                        className="w-32 rounded-lg border border-border bg-bg-primary px-3 py-2 text-right font-mono text-sm text-primary focus:border-gold focus:outline-none"
                                    />
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <div className="w-[7.25rem] max-w-[7.25rem] space-y-1.5">
                                        <SourceBadge
                                            source={input.source}
                                            className="max-w-full justify-center whitespace-normal break-words px-2 py-1 text-center leading-4"
                                        />
                                        <span className="block text-[11px] leading-4 text-secondary break-words line-clamp-2">
                                            <SourceDescription
                                                source={input.source}
                                                totalTrades={input.totalTrades}
                                                currentStock={input.currentStock}
                                                variant="compact"
                                            />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={state.taxedItemIds.includes(input.itemId)}
                                        onChange={() => onToggleTaxedItem(input.itemId)}
                                        className="size-4 accent-[var(--color-gold)]"
                                    />
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-loss">{formatSilver(input.totalCost)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function OutputTable({
    outputs,
    customPrices,
    keptItemIds,
    onToggleKeptItem,
    onSetCustomPrice,
}: {
    outputs: RecipeTreeNode['outputs'];
    customPrices: CraftingCalculatorState['customPrices'];
    keptItemIds: number[];
    onToggleKeptItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-secondary">
                    <tr>
                        <th className="px-4 py-4 text-left">Saída</th>
                        <th className="px-4 py-4 text-right">Qtd</th>
                        <th className="px-4 py-4 text-right">Preço un.</th>
                        <th className="px-4 py-4 text-left">Tipo</th>
                        <th className="px-4 py-4 text-center">Manter</th>
                        <th className="px-4 py-4 text-right">Retorno</th>
                    </tr>
                </thead>
                <tbody>
                    {outputs.map((output) => {
                        const outputIconUrl = resolveBdoIconUrl(output.iconUrl);

                        return (
                            <tr key={`${output.kind}-${output.itemId}`} className="border-t border-border align-top">
                                <td className="px-4 py-4 text-primary">
                                    <div className="flex items-start gap-4">
                                        {outputIconUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={outputIconUrl} alt={output.name} className="h-10 w-10 rounded-lg border border-border bg-bg-primary" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-lg border border-border bg-bg-primary" />
                                        )}
                                        <div className="flex flex-col gap-1.5">
                                            <span className="font-medium">{output.name}</span>
                                            <span className="text-xs text-secondary">{SOURCE_META[output.source].description}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-primary">{output.quantity.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right">
                                    <input
                                        type="number"
                                        value={customPrices[output.itemId] ?? output.unitPrice}
                                        onChange={(event) => onSetCustomPrice(output.itemId, Number(event.target.value))}
                                        className="w-32 rounded-lg border border-border bg-bg-primary px-3 py-2 text-right font-mono text-sm text-primary focus:border-gold focus:outline-none"
                                    />
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <div className="flex flex-col items-start gap-1.5">
                                        <span className="text-xs font-medium text-primary">{OUTPUT_KIND_LABEL[output.kind]}</span>
                                        <SourceBadge source={output.source} />
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={keptItemIds.includes(output.itemId)}
                                        onChange={() => onToggleKeptItem(output.itemId)}
                                        className="size-4 accent-[var(--color-gold)]"
                                    />
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-profit">{formatSilver(output.totalRevenue)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function OverviewPanel({
    leafInputs,
    customPrices,
    taxedItemIds,
    keptItemIds,
    tree,
    onToggleTaxedItem,
    onToggleKeptItem,
    onSetCustomPrice,
}: {
    leafInputs: LeafInputRow[];
    customPrices: CraftingCalculatorState['customPrices'];
    taxedItemIds: number[];
    keptItemIds: number[];
    tree: RecipeTreeNode;
    onToggleTaxedItem: (itemId: number) => void;
    onToggleKeptItem: (itemId: number) => void;
    onSetCustomPrice: (itemId: number, value: number | null) => void;
}) {
    return (
        <div className="space-y-7">
            <div className="rounded-2xl border border-border bg-bg-hover/10 p-5">
                <p className="text-sm font-semibold text-primary">Visão principal do lote</p>
                <p className="mt-2 text-xs leading-5 text-secondary">
                    Entradas e saídas calculadas para a quantidade atual. A origem do preço é exibida de forma explícita
                    para evitar precisão falsa em itens de mercado, vendor/NPC ou sem cotação conhecida.
                </p>
            </div>

            <div className="rounded-2xl border border-border bg-bg-hover/10 p-5">
                <SectionHeader
                    title="Entradas"
                    description="Materiais base necessários após resolver sub-receitas e materiais selecionados na árvore."
                />
                <InputTable
                    inputs={leafInputs}
                    state={{ customPrices, taxedItemIds }}
                    onToggleTaxedItem={onToggleTaxedItem}
                    onSetCustomPrice={onSetCustomPrice}
                />
            </div>

            <div className="rounded-2xl border border-border bg-bg-hover/10 p-5">
                <SectionHeader
                    title="Saídas"
                    description="Resultado principal, proc raro e subproduto, respeitando itens mantidos e preços configurados."
                />
                <OutputTable
                    outputs={tree.outputs}
                    customPrices={customPrices}
                    keptItemIds={keptItemIds}
                    onToggleKeptItem={onToggleKeptItem}
                    onSetCustomPrice={onSetCustomPrice}
                />
            </div>
        </div>
    );
}

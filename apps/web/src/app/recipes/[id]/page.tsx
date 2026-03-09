'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Package, ChefHat, FlaskConical, Hammer } from 'lucide-react';

interface PriceEntry {
    basePrice: bigint;
    lastSoldPrice: bigint | null;
    totalTrades: number;
}

interface ItemWithPrices {
    id: number;
    name: string;
    prices: PriceEntry[];
}

interface Ingredient {
    itemId: number;
    quantity: number;
    item: ItemWithPrices;
}

export default function RecipeDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const recipeId = parseInt(params.id as string);

    const { data: recipe, isLoading } = trpc.recipe.getById.useQuery({ recipeId });

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 animate-pulse">
                <div className="h-8 bg-bg-hover w-1/3 rounded" />
                <div className="h-64 bg-bg-hover w-full rounded-xl" />
                <div className="h-48 bg-bg-hover w-full rounded-xl" />
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl text-secondary">Receita não encontrada.</h2>
                <button onClick={() => router.back()} className="mt-4 text-gold hover:underline">Voltar</button>
            </div>
        );
    }

    const TypeIcon = recipe.type === 'cooking' ? ChefHat : recipe.type === 'alchemy' ? FlaskConical : Hammer;
    const themeColor = recipe.type === 'cooking' ? 'text-gold' : recipe.type === 'alchemy' ? 'text-purple-400' : 'text-orange-400';

    const resultPrice = recipe.resultItem.prices[0]
        ? Number(recipe.resultItem.prices[0].lastSoldPrice ?? recipe.resultItem.prices[0].basePrice)
        : 0;
    const ingredients = recipe.ingredients as Ingredient[];

    const ingredientCost = ingredients.reduce((sum: number, ing) => {
        const price = ing.item.prices[0]
            ? Number(ing.item.prices[0].lastSoldPrice ?? ing.item.prices[0].basePrice)
            : 0;
        return sum + (ing.quantity * price);
    }, 0);

    const taxRate = 0.35 * 0.70; // com Value Pack
    const revenue = resultPrice * Number(recipe.resultQuantity) * (1 - taxRate);
    const profit = Number(revenue) - Number(ingredientCost);

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-bg-hover rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-secondary" />
                </button>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <TypeIcon size={24} className={themeColor} />
                        <h1 className="text-2xl font-bold text-primary">{recipe.name}</h1>
                        <span className="grade-badge grade-white uppercase text-[10px]">{recipe.type}</span>
                    </div>
                    <p className="text-sm text-secondary">
                        ID: {recipe.id} • Produz {recipe.resultQuantity}x {recipe.resultItem.name}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cards de Resumo */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="card p-4 border border-border bg-bg-hover/20">
                            <p className="text-xs text-secondary mb-1">💰 Receita Bruta</p>
                            <p className="text-lg font-mono font-bold text-primary">
                                {revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} S
                            </p>
                        </div>
                        <div className="card p-4 border border-border bg-bg-hover/20">
                            <p className="text-xs text-secondary mb-1">📦 Custo Materiais</p>
                            <p className="text-lg font-mono font-bold text-loss">
                                {ingredientCost.toLocaleString('pt-BR')} S
                            </p>
                        </div>
                        <div className={`card p-4 border ${profit > 0 ? 'border-profit/30 bg-profit/5' : 'border-loss/30 bg-loss/5'}`}>
                            <p className="text-xs text-secondary mb-1">📊 Lucro Líquido</p>
                            <p className={`text-lg font-mono font-bold ${profit > 0 ? 'text-profit' : 'text-loss'}`}>
                                {profit > 0 ? '+' : ''}{profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} S
                            </p>
                        </div>
                    </div>

                    {/* Info sobre resultado */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Package size={18} className={themeColor} /> Resultado
                        </h2>
                        <div className="flex items-center gap-4 p-4 bg-bg-hover/30 rounded-lg border border-border">
                            <div className="w-12 h-12 rounded bg-bg-primary border border-border flex items-center justify-center">
                                <TypeIcon size={20} className="text-muted" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-primary">{recipe.resultItem.name}</p>
                                <p className="text-xs text-secondary mt-0.5">
                                    Quantidade: {recipe.resultQuantity}x • Preço: {resultPrice.toLocaleString('pt-BR')} S
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-secondary">Volume</p>
                                <p className="font-mono font-bold text-primary">
                                    {recipe.resultItem.prices[0]?.totalTrades?.toLocaleString('pt-BR') ?? '0'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ingredientes */}
                <div className="flex flex-col gap-6">
                    <div className="card p-6">
                        <h3 className="font-semibold text-primary flex items-center gap-2 mb-4">
                            <Package size={18} className="text-info" /> Ingredientes
                        </h3>
                        <div className="space-y-4">
                            {ingredients.map((ing) => {
                                const ingPrice = ing.item.prices[0]
                                    ? Number(ing.item.prices[0].lastSoldPrice ?? ing.item.prices[0].basePrice)
                                    : 0;
                                const totalCost = ing.quantity * ingPrice;

                                return (
                                    <div key={ing.itemId} className="flex items-start justify-between gap-4 px-4 py-4 bg-bg-hover/30 rounded-xl border border-border">
                                        <div className="space-y-1.5">
                                            <p className="font-medium text-sm text-primary">{ing.item.name}</p>
                                            <p className="text-xs leading-5 text-secondary">
                                                {ing.quantity}x • {ingPrice.toLocaleString('pt-BR')} S/un
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-mono font-medium text-loss">
                                                {totalCost.toLocaleString('pt-BR')} S
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`card p-6 border ${profit > 0 ? 'border-profit/20' : 'border-loss/20'}`}>
                        <h3 className="font-semibold mb-2">Recomendação</h3>
                        <p className="text-sm text-secondary">
                            {profit > 0
                                ? '✅ Esta receita é lucrativa! Considere craftar se tiver os materiais.'
                                : '⚠️ Esta receita não é lucrativa com os preços atuais do mercado.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

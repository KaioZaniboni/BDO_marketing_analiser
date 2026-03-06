import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
    calculateNetMultiplier,
    matchInventory,
    analyzeProfitability,
    rankRecipes,
} from '../services/calculator';
import { getMultipleItemPrices } from '../services/market';
import { IMPERIAL_TIERS, getImperialBonus, IMPERIAL_RECIPES_MAPPING } from '../services/imperial-data';
import type { RankingWeights } from '../types';

const taxConfigSchema = z.object({
    baseTaxRate: z.number().min(0).max(1).default(0.35),
    hasValuePack: z.boolean().default(false),
    hasMerchantRing: z.boolean().default(false),
    familyFame: z.number().int().min(0).default(0),
});

const rankingWeightsSchema = z.object({
    roi: z.number().min(0).max(1).default(0.40),
    liquidity: z.number().min(0).max(1).default(0.35),
    profit: z.number().min(0).max(1).default(0.25),
});

const imperialListSchema = z.object({
    type: z.enum(['cooking', 'alchemy']).optional(),
    mastery: z.number().min(0).max(2000).default(0),
    taxConfig: taxConfigSchema.optional(),
});

export const recipeRouter = router({
    /** Lista todas as receitas com filtros */
    list: publicProcedure
        .input(z.object({
            type: z.enum(['cooking', 'alchemy', 'processing']).optional(),
            limit: z.number().int().min(1).max(500).default(200),
            offset: z.number().int().min(0).default(0),
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = {};
            if (input.type) where.type = input.type;
            if (input.search) {
                where.name = { contains: input.search, mode: 'insensitive' };
            }

            const rawRecipes = await ctx.prisma.recipe.findMany({
                where,
                include: {
                    resultItem: {
                        include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                    },
                    ingredients: {
                        include: {
                            item: {
                                include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                            },
                        },
                        orderBy: { sortOrder: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            });

            // Agrupa por nome para remover duplicatas
            const uniqueMap = new Map();
            for (const r of rawRecipes) {
                if (!uniqueMap.has(r.name)) {
                    uniqueMap.set(r.name, r);
                }
            }

            const uniqueList = Array.from(uniqueMap.values());

            // Aplica paginação em memória apó agrupar (já que estamos bypassando o Prisma distinct)
            return uniqueList.slice(input.offset, input.offset + input.limit);
        }),

    /** Catálogo completo de receitas para calculadoras client-side */
    catalog: publicProcedure
        .input(z.object({
            types: z.array(z.enum(['cooking', 'alchemy', 'processing'])).min(1).optional(),
            historyDays: z.number().int().min(1).max(60).default(28),
        }))
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = {};
            if (input.types?.length) {
                where.type = { in: input.types };
            }

            return ctx.prisma.recipe.findMany({
                where,
                include: {
                    resultItem: {
                        include: {
                            prices: { where: { enhancementLevel: 0 }, take: 1 },
                            priceHistory: {
                                take: input.historyDays,
                                orderBy: { recordedDate: 'desc' },
                            },
                        },
                    },
                    procItem: {
                        include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                    },
                    ingredients: {
                        include: {
                            item: {
                                include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                            },
                        },
                        orderBy: { sortOrder: 'asc' },
                    },
                },
                orderBy: [
                    { type: 'asc' },
                    { name: 'asc' },
                    { id: 'asc' },
                ],
            });
        }),

    /** Detalhes de uma receita por ID */
    getById: publicProcedure
        .input(z.object({ recipeId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            const recipe = await ctx.prisma.recipe.findUnique({
                where: { id: input.recipeId },
                include: {
                    resultItem: {
                        include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                    },
                    procItem: {
                        include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                    },
                    ingredients: {
                        include: {
                            item: {
                                include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                            },
                        },
                        orderBy: { sortOrder: 'asc' },
                    },
                },
            });

            if (!recipe) return null;

            // Busca todas as variantes com o mesmo nome e tipo para encontrar ingredientes alternativos
            const variants = await ctx.prisma.recipe.findMany({
                where: { name: recipe.name, type: recipe.type, resultItemId: recipe.resultItemId },
                include: {
                    ingredients: {
                        include: {
                            item: {
                                include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                            },
                        },
                        orderBy: { sortOrder: 'asc' },
                    },
                },
            });

            // Busca todas as sub-receitas referentes a todos os possíveis ingredientes
            const allIngItemIds = new Set<number>();
            variants.forEach(v => v.ingredients.forEach(i => allIngItemIds.add(i.itemId)));

            const subRecipes = await ctx.prisma.recipe.findMany({
                where: { resultItemId: { in: Array.from(allIngItemIds) } },
                select: { id: true, resultItemId: true, type: true },
            });
            const subRecipeMap = new Map<number, { id: number, type: string }>();
            subRecipes.forEach((sr: any) => { if (!subRecipeMap.has(sr.resultItemId)) subRecipeMap.set(sr.resultItemId, { id: sr.id, type: sr.type }); });

            // Build co-occurrence matrix to find valid slots
            const coOccurs = new Set<string>();
            const allItemsMap = new Map<number, any>();

            variants.forEach(v => {
                v.ingredients.forEach(i => {
                    const subRecipeInfo = subRecipeMap.get(i.itemId);
                    const mapped = {
                        ...i,
                        subRecipeId: subRecipeInfo ? subRecipeInfo.id : null,
                        subRecipeType: subRecipeInfo ? subRecipeInfo.type : null
                    };
                    allItemsMap.set(i.itemId, mapped);
                    v.ingredients.forEach(j => {
                        if (i.itemId !== j.itemId) {
                            coOccurs.add(`${i.itemId}-${j.itemId}`);
                        }
                    });
                });
            });

            type Ingredient = typeof recipe.ingredients[0] & { subRecipeId: number | null, subRecipeType: string | null };
            const ingredientAlternatives: Record<number, Ingredient[]> = {};

            recipe.ingredients.forEach((baseIng, idx) => {
                ingredientAlternatives[idx] = [];
                const baseId = baseIng.itemId;

                for (const [itemId, variantIng] of allItemsMap.entries()) {
                    // It belongs to the current slot if it NEVER co-occurs with the base ingredient of this slot
                    // (Or if it IS the exact base ingredient)
                    if (itemId === baseId || !coOccurs.has(`${baseId}-${itemId}`)) {
                        ingredientAlternatives[idx].push(variantIng as unknown as Ingredient);
                    }
                }

                // Sort by default base first, then by item id so dropdown is stable
                ingredientAlternatives[idx].sort((a, b) => {
                    if (a.itemId === baseId) return -1;
                    if (b.itemId === baseId) return 1;
                    return a.itemId - b.itemId;
                });
            });

            return { ...recipe, ingredientAlternatives };
        }),

    /** Retorna as caixas imperiais suportadas com cálculo otimizado (BDOLytics Clone) */
    getImperialRanking: publicProcedure
        .input(imperialListSchema)
        .query(async ({ ctx, input }) => {
            // Filtrar recipes que são compatíveis com caixas imperiais
            const validIds = Object.keys(IMPERIAL_RECIPES_MAPPING).map(Number);
            const rawRecipes = await ctx.prisma.recipe.findMany({
                where: {
                    resultItemId: { in: validIds },
                    type: input.type
                },
                include: {
                    resultItem: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } },
                    ingredients: {
                        include: {
                            item: { include: { prices: { where: { enhancementLevel: 0 }, take: 1 } } }
                        }
                    }
                }
            });

            // Agrupa variante de menor custo
            const uniqueMap = new Map();
            for (const r of rawRecipes) {
                const cost = r.ingredients.reduce((acc: number, ing: any) => {
                    const ingPrice = Number(ing.item?.prices?.[0]?.lastSoldPrice ?? ing.item?.prices?.[0]?.basePrice ?? 0);
                    return acc + (ing.quantity * ingPrice);
                }, 0);

                if (!uniqueMap.has(r.name)) {
                    uniqueMap.set(r.name, { ...r, cost });
                } else {
                    // Escolhe a variação mais barata para craftar a caixa
                    if (cost < uniqueMap.get(r.name).cost) {
                        uniqueMap.set(r.name, { ...r, cost });
                    }
                }
            }

            const uniqueRecipes = Array.from(uniqueMap.values());
            const taxMultiplier = calculateNetMultiplier(input.taxConfig || { baseTaxRate: 0.35, hasValuePack: true, hasMerchantRing: false, familyFame: 0 });

            const out = uniqueRecipes.map(r => {
                const boxInfo = IMPERIAL_RECIPES_MAPPING[r.resultItemId];
                const baseItemPrice = Number(r.resultItem?.prices?.[0]?.lastSoldPrice ?? r.resultItem?.prices?.[0]?.basePrice ?? 0);
                const dailyVolume = Number(r.resultItem?.prices?.[0]?.totalTrades ?? 0);

                // NPC Paga = (BasePrice * 2.5) + (BasePrice * 2.5 * MasteryBonus)
                const masteryBonusPct = getImperialBonus(input.mastery) / 100;
                const baseBoxNPCPrice = boxInfo.tier.basePrice * 2.5;
                const imperialBoxPrice = baseBoxNPCPrice + (baseBoxNPCPrice * masteryBonusPct);

                const costPerBox = r.cost * boxInfo.qtyRequired; // Custo do craft do número de itens que fecham 1 caixa
                const profitPerBox = imperialBoxPrice - costPerBox;

                // Revenue se vendesse solto no mercado para comparar (com VP/taxes applied)
                const marketRevenuePerBox = (baseItemPrice * boxInfo.qtyRequired) * taxMultiplier;

                return {
                    id: r.id,
                    name: r.name,
                    resultItemId: r.resultItemId,
                    baseItemPrice,
                    boxInfo,
                    costPerBox,
                    imperialBoxPrice: Math.floor(imperialBoxPrice),
                    profitPerBox: Math.floor(profitPerBox),
                    marketRevenuePerBox: Math.floor(marketRevenuePerBox),
                    dailyVolume
                };
            });

            // Ordenar por maior lucro por caixa
            out.sort((a, b) => b.profitPerBox - a.profitPerBox);
            return out;
        }),

    /** Calcula taxa líquida do mercado */
    calculateTax: publicProcedure
        .input(taxConfigSchema)
        .query(({ input }) => {
            const multiplier = calculateNetMultiplier(input);
            return {
                multiplier,
                effectiveTaxRate: Math.round((1 - multiplier) * 10000) / 100,
                netPercentage: Math.round(multiplier * 10000) / 100,
            };
        }),

    /** Analisa lucratividade de uma receita para o usuário */
    analyzeProfitability: protectedProcedure
        .input(z.object({
            recipeId: z.number().int().positive(),
            craftCount: z.number().int().min(1).max(10000).default(1),
            taxConfig: taxConfigSchema,
        }))
        .query(async ({ ctx, input }) => {
            // Buscar receita com ingredientes
            const recipe = await ctx.prisma.recipe.findUnique({
                where: { id: input.recipeId },
                include: {
                    resultItem: {
                        include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                    },
                    ingredients: { include: { item: true } },
                },
            });

            if (!recipe) throw new Error('Receita não encontrada');

            // Buscar inventário do usuário
            const inventory = await ctx.prisma.userInventory.findMany({
                where: { userId: ctx.session.userId },
            });
            const userInventory = new Map<number, number>(
                inventory.map((i: { itemId: number; quantity: number }) => [i.itemId, i.quantity] as [number, number]),
            );

            // Buscar preços de mercado dos ingredientes
            const ingredientIds = recipe.ingredients.map((i: { itemId: number }) => i.itemId);
            const marketPrices = await getMultipleItemPrices(ingredientIds);
            const priceMap = new Map<number, number>();
            for (const [id, item] of marketPrices) {
                priceMap.set(id, item.lastSoldPrice || item.basePrice);
            }

            // Match de inventário
            const match = matchInventory(
                recipe.id,
                recipe.ingredients.map((i: { itemId: number; quantity: number }) => ({
                    itemId: i.itemId,
                    quantity: i.quantity,
                })),
                userInventory as Map<number, number>,
                priceMap,
                input.craftCount,
            );

            // Preço do resultado
            const resultPrice = recipe.resultItem.prices[0]
                ? Number(recipe.resultItem.prices[0].lastSoldPrice ?? recipe.resultItem.prices[0].basePrice)
                : 0;

            // Análise de lucratividade
            const analysis = analyzeProfitability(
                match,
                recipe.name,
                resultPrice,
                recipe.resultQuantity * input.craftCount,
                priceMap,
                input.taxConfig,
            );

            return { match, analysis };
        }),

    /** Ranking global de receitas */
    getRanking: publicProcedure
        .input(z.object({
            type: z.enum(['cooking', 'alchemy', 'processing']).optional(),
            weights: rankingWeightsSchema.optional(),
            limit: z.number().int().min(1).max(100).default(50),
        }))
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = {};
            if (input.type) where.type = input.type;

            const rawRecipes = await ctx.prisma.recipe.findMany({
                where,
                include: {
                    resultItem: {
                        include: { prices: { where: { enhancementLevel: 0 }, take: 1 } },
                    },
                    ingredients: { include: { item: true } },
                },
            });

            const uniqueMap = new Map();
            for (const r of rawRecipes) {
                if (!uniqueMap.has(r.name)) {
                    uniqueMap.set(r.name, r);
                }
            }
            const recipes = Array.from(uniqueMap.values()).slice(0, input.limit);

            // Buscar preços de mercado para todos os itens resultado
            const resultItemIds = recipes.map((r: { resultItemId: number }) => r.resultItemId);
            const marketData = await getMultipleItemPrices(resultItemIds);

            // Calcular análise simplificada (sem inventário de usuário)
            const defaultTax = { baseTaxRate: 0.35, hasValuePack: true, hasMerchantRing: false, familyFame: 0 };
            const emptyInventory = new Map<number, number>();

            // Buscar todos os preços de ingredientes
            const allIngredientIds = Array.from(new Set<number>(recipes.flatMap((r: { ingredients: Array<{ itemId: number }> }) => r.ingredients.map((i: { itemId: number }) => i.itemId))));
            const allPrices = await getMultipleItemPrices(allIngredientIds);
            const priceMap = new Map<number, number>();
            for (const [id, item] of allPrices) {
                priceMap.set(id, item.lastSoldPrice || item.basePrice);
            }

            const recipesForRanking = recipes.map((recipe: { id: number; name: string; type: string; resultItemId: number; resultQuantity: number; resultItem: { prices: Array<{ lastSoldPrice: bigint | null; basePrice: bigint }> }; ingredients: Array<{ itemId: number; quantity: number }> }) => {
                const match = matchInventory(
                    recipe.id,
                    recipe.ingredients.map((i: { itemId: number; quantity: number }) => ({ itemId: i.itemId, quantity: i.quantity })),
                    emptyInventory,
                    priceMap,
                );

                const resultPrice = recipe.resultItem.prices[0]
                    ? Number(recipe.resultItem.prices[0].lastSoldPrice ?? recipe.resultItem.prices[0].basePrice)
                    : 0;

                const analysis = analyzeProfitability(
                    match,
                    recipe.name,
                    resultPrice,
                    recipe.resultQuantity,
                    priceMap,
                    defaultTax,
                );

                return {
                    recipeId: recipe.id,
                    recipeName: recipe.name,
                    recipeType: recipe.type,
                    resultItemId: recipe.resultItemId,
                    analysis,
                };
            });

            return rankRecipes(
                recipesForRanking,
                Object.fromEntries(marketData) as unknown as Map<number, any>,
                input.weights,
            );
        }),
});

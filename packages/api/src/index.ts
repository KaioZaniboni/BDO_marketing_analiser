import { router } from './trpc';
import { marketRouter } from './routers/market';
import { recipeRouter } from './routers/recipe';
import { inventoryRouter } from './routers/inventory';
import { recipeCurationRouter } from './routers/recipe-curation';

/**
 * Router raiz do tRPC — agrupa todos os sub-routers.
 */
export const appRouter = router({
    market: marketRouter,
    recipe: recipeRouter,
    inventory: inventoryRouter,
    recipeCuration: recipeCurationRouter,
});

/** Tipo do router — usado pelo client tRPC no frontend */
export type AppRouter = typeof appRouter;

// Re-exports para uso externo
export { type Context, type SessionContextUser } from './trpc';
export { router, publicProcedure, protectedProcedure, adminProcedure, isAdminSession } from './trpc';
export type {
    TaxConfig,
    InventoryMatch,
    ProfitAnalysis,
    RankedRecipe,
    RankingWeights,
    MarketItem,
} from './types';
export {
    calculateNetMultiplier,
    matchInventory,
    analyzeProfitability,
    rankRecipes,
} from './services/calculator';

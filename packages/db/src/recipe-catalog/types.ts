export const SUPPORTED_RECIPE_TYPES = ['cooking', 'alchemy', 'processing'] as const;

export type SupportedRecipeType = (typeof SUPPORTED_RECIPE_TYPES)[number];
export type CatalogSkipReason =
    | 'unsupported_type'
    | 'missing_ingredients'
    | 'missing_material_rows'
    | 'missing_products'
    | 'missing_base_product';

export interface Item {
    id: number;
    name: string;
    iconUrl?: string;
    grade?: number;
    categoryId?: number;
    isTradeable?: boolean;
}

export interface RecipeIngredient {
    itemId: number;
    quantity: number;
}

export interface SeedRecipe {
    id: number;
    name: string;
    type: SupportedRecipeType;
    experience: number;
    cookTimeSeconds: number;
    ingredients: RecipeIngredient[];
    resultItemId: number;
    resultQuantity: number;
    procItemId?: number | null;
    procQuantity?: number | null;
}

export interface RawCatalogItem {
    id?: number | null;
    name?: string | null;
    icon_image?: string | null;
    grade_type?: number | null;
    market_main_category?: number | null;
    amount?: unknown;
    amounts?: unknown[] | null;
}

export interface RawCatalogRecipe extends Record<string, unknown> {
    id: number;
    name?: string | null;
    main_category?: string | null;
    grade_type?: number | null;
    ingredients?: RawCatalogItem[] | null;
    products?: RawCatalogItem[] | null;
    results?: RawCatalogItem[] | null;
}

export interface CatalogValidationReport {
    snapshotTotal: number;
    snapshotByType: Record<SupportedRecipeType, number>;
    seedRecipeTotal: number;
    seedRecipeByType: Record<SupportedRecipeType, number>;
    itemTotal: number;
    duplicateSnapshotIds: number[];
    skippedRecipeIds: number[];
    skippedByReason: Record<CatalogSkipReason, number>;
    missingItemIds: number[];
}

export interface CatalogArtifacts {
    snapshotRecipes: RawCatalogRecipe[];
    items: Item[];
    recipes: SeedRecipe[];
    report: CatalogValidationReport;
}

export interface SeedDataBuildResult {
    items: Item[];
    recipes: SeedRecipe[];
    skippedRecipeIds: number[];
    skippedByReason: Record<CatalogSkipReason, number>;
}

export interface CatalogPaths {
    snapshotPath: string;
    itemsPath: string;
    recipesPath: string;
    legacyMarketSeedPath: string;
    seedDataDir: string;
}
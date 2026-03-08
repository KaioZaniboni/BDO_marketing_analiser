export interface RecipeIdentityInput {
    type: string;
    name: string;
    resultItemId: number;
}

export function getRecipeVariantKey(recipe: RecipeIdentityInput): string {
    return `${recipe.type}:${recipe.resultItemId}:${recipe.name.toLowerCase()}`;
}

export function compareRecipesByTypeNameId(
    left: { id: number; type: string; name: string },
    right: { id: number; type: string; name: string },
): number {
    return left.type.localeCompare(right.type)
        || left.name.localeCompare(right.name)
        || left.id - right.id;
}
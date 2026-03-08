export interface IngredientWithItemId {
    itemId: number;
}

export interface RecipeWithIngredients<TIngredient extends IngredientWithItemId> {
    ingredients: TIngredient[];
}

export interface SubRecipeReference<TType extends string> {
    id: number;
    type: TType;
}

function getPairKey(leftItemId: number, rightItemId: number): string {
    return `${leftItemId}-${rightItemId}`;
}

export type IngredientAlternativeWithSubRecipe<
    TIngredient extends IngredientWithItemId,
    TType extends string,
> = TIngredient & {
    subRecipeId: number | null;
    subRecipeType: TType | null;
};

export function buildIngredientAlternativesBySlot<
    TIngredient extends IngredientWithItemId,
    TRecipe extends RecipeWithIngredients<TIngredient>,
    TType extends string = string,
>(
    recipe: TRecipe,
    variants: TRecipe[],
    getSubRecipe: (itemId: number) => SubRecipeReference<TType> | null | undefined,
): Record<number, IngredientAlternativeWithSubRecipe<TIngredient, TType>[]> {
    const resolvedVariants = variants.length > 0 ? variants : [recipe];
    const coOccurs = new Set<string>();
    const allItemsMap = new Map<number, IngredientAlternativeWithSubRecipe<TIngredient, TType>>();

    for (const variant of resolvedVariants) {
        for (const ingredient of variant.ingredients) {
            const subRecipe = getSubRecipe(ingredient.itemId);
            allItemsMap.set(ingredient.itemId, {
                ...ingredient,
                subRecipeId: subRecipe?.id ?? null,
                subRecipeType: subRecipe?.type ?? null,
            });

            for (const otherIngredient of variant.ingredients) {
                if (ingredient.itemId !== otherIngredient.itemId) {
                    coOccurs.add(getPairKey(ingredient.itemId, otherIngredient.itemId));
                }
            }
        }
    }

    const ingredientAlternatives: Record<number, IngredientAlternativeWithSubRecipe<TIngredient, TType>[]> = {};

    recipe.ingredients.forEach((baseIngredient, index) => {
        ingredientAlternatives[index] = [];

        for (const [itemId, option] of allItemsMap.entries()) {
            if (itemId === baseIngredient.itemId || !coOccurs.has(getPairKey(baseIngredient.itemId, itemId))) {
                ingredientAlternatives[index].push(option);
            }
        }

        ingredientAlternatives[index].sort((left, right) => {
            if (left.itemId === baseIngredient.itemId) {
                return -1;
            }
            if (right.itemId === baseIngredient.itemId) {
                return 1;
            }
            return left.itemId - right.itemId;
        });
    });

    return ingredientAlternatives;
}
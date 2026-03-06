'use client';

import { useParams } from 'next/navigation';
import { CraftingRecipePage } from '@/components/crafting/CraftingRecipePage';

export default function AlchemyRecipeDetailPage() {
    const params = useParams();
    const recipeId = Number(params.id);

    return <CraftingRecipePage recipeId={recipeId} />;
}

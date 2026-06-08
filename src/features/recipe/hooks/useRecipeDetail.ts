import { useQuery } from "@tanstack/react-query"
import { recipeCatalogService } from "../services/recipeCatalogService"

export function useRecipeDetail(recipeId: number | null) {
  return useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => recipeCatalogService.getRecipe(recipeId!),
    enabled: recipeId != null,
  })
}

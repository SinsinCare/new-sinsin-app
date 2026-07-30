import { useQuery } from "@tanstack/react-query"
import { recipeCatalogService } from "../services/recipeCatalogService"
import { useTranslation } from "react-i18next"
import { normalizeLanguage, type Language } from "@/src/i18n"

export function useRecipeDetail(
  recipeId: number | null,
  localeOverride?: Language,
) {
  const { i18n } = useTranslation()
  const language =
    localeOverride ?? normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  return useQuery({
    queryKey: ["recipe", language, recipeId],
    queryFn: () =>
      recipeCatalogService.getRecipe(recipeId!, { locale: language }),
    enabled: recipeId != null,
  })
}

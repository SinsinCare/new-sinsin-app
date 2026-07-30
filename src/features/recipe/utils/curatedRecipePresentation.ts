import type { Language } from "@/src/i18n"
import type { CuratedRecipe } from "../data/curatedRecipeTypes"

export interface CuratedRecipeContentPresentation {
  isEnglishCatalog: boolean
  hasEnglishContentGap: boolean
  ingredientCount: number
  stepCount: number
}

export function getCuratedRecipeContentPresentation(
  recipe: CuratedRecipe | null,
  language: Language,
): CuratedRecipeContentPresentation {
  const isEnglishCatalog =
    language === "en" && Boolean(recipe?.sourceKey?.startsWith("recipe_"))
  const availability = recipe?.content_availability

  return {
    isEnglishCatalog,
    hasEnglishContentGap:
      isEnglishCatalog &&
      Boolean(
        availability &&
        (!availability.ingredients_available || !availability.steps_available),
      ),
    ingredientCount:
      availability?.ingredient_count ?? recipe?.ingredients.length ?? 0,
    stepCount: availability?.step_count ?? recipe?.steps.length ?? 0,
  }
}

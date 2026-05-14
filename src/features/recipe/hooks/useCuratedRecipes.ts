import { useMemo } from "react"
import recipesData from "../data/curatedRecipes.json"
import type { CuratedRecipe, CuratedRecipesData } from "../data/curatedRecipeTypes"

const CATEGORY_MAP: Record<string, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
  salad: "샐러드",
  dessert: "디저트",
}

const NUTRITION_TAG_MAP: Record<string, string> = {
  "low-salt": "#저염식",
  "low-protein": "#저단백",
  "low-potassium": "#저칼륨",
  "low-phosphorus": "#저인",
}

interface UseCuratedRecipesOptions {
  search?: string
  categories?: Set<string>
  nutritionFilters?: Set<string>
}

export function useCuratedRecipes({
  search = "",
  categories = new Set<string>(),
  nutritionFilters = new Set<string>(),
}: UseCuratedRecipesOptions = {}): CuratedRecipe[] {
  const allRecipes = (recipesData as CuratedRecipesData).recipes

  return useMemo(() => {
    let result = allRecipes

    // Category filter
    if (categories.size > 0) {
      const categoryLabels = new Set(
        [...categories].map((k) => CATEGORY_MAP[k] ?? k),
      )
      result = result.filter((r) => categoryLabels.has(r.category))
    }

    // Nutrition filter
    if (nutritionFilters.size > 0) {
      const requiredTags = [...nutritionFilters].map(
        (k) => NUTRITION_TAG_MAP[k] ?? k,
      )
      result = result.filter((r) =>
        requiredTags.every((tag) => r.tags.includes(tag)),
      )
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    return result
  }, [allRecipes, search, categories, nutritionFilters])
}

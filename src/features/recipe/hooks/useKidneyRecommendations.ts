import { useMemo } from "react"
import { KidneyRecommendedFood } from "../types"
import { searchRecommendedFoods } from "../data/lowPhosphorusFoods"
import { scoreFood } from "../data/scoringEngine"
import { searchFoods } from "../data/foodNutritionData"

export function useKidneyRecommendations(query: string) {
  const recommendations = useMemo<KidneyRecommendedFood[]>(() => {
    if (!query.trim()) {
      return searchRecommendedFoods("")
    }
    // When searching, score and sort matching foods from full dataset
    const matched = searchFoods(query)
    return matched
      .map(scoreFood)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
  }, [query])

  return { recommendations }
}

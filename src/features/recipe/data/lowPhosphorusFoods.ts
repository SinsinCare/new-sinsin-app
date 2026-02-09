import { KidneyRecommendedFood } from "../types"
import { getAllScoredFoods } from "./scoringEngine"

const TOP_N = 40

let _cachedTop: KidneyRecommendedFood[] | null = null

export function getTopRecommendedFoods(): KidneyRecommendedFood[] {
  if (_cachedTop) return _cachedTop
  _cachedTop = getAllScoredFoods().slice(0, TOP_N)
  return _cachedTop
}

export function searchRecommendedFoods(query: string): KidneyRecommendedFood[] {
  if (!query.trim()) return getTopRecommendedFoods()
  const lower = query.toLowerCase()
  return getAllScoredFoods().filter((f) =>
    f.food.name.toLowerCase().includes(lower),
  )
}

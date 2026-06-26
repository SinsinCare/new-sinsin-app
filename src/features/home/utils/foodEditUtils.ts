import type { FoodAnalysisUpdateRequest } from "@/src/types"

export function getInitialEatenStep(
  eatenPercentage: number | undefined,
): number {
  // eatenPercentage is 0–100 integer from the API
  const pct = eatenPercentage ?? 100
  return Math.min(3, Math.max(0, Math.round((pct / 100) * 4) - 1))
}

export function validateMealTitle(title: string): {
  isValid: boolean
  message: string
} {
  if (!title.trim()) {
    return { isValid: false, message: "식단 이름을 입력해주세요" }
  }
  return { isValid: true, message: "" }
}

export interface EditableFoodItem {
  id?: number
  name: string
  amount: string
  unit: string
}

export function buildFoodAnalysisUpdateRequest(input: {
  servings: number
  eatenPercentage: number
  foods: EditableFoodItem[]
}): FoodAnalysisUpdateRequest {
  return {
    servings: input.servings,
    eatenPercentage: input.eatenPercentage,
    foods: input.foods.map((food) => ({
      foodId: food.id,
      name: food.name.trim(),
      servingSizeValue: Number(food.amount) || 0,
      servingSizeUnit: food.unit,
    })),
  }
}

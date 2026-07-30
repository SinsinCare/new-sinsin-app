import type {
  FoodAnalysisUpdateRequest,
  FoodCameraAnalyzeResult,
  FoodCameraNutritionTotal,
} from "@/src/types"

function scaleNutrients(
  nutrients: FoodCameraNutritionTotal,
  ratio: number,
): FoodCameraNutritionTotal {
  return Object.fromEntries(
    Object.entries(nutrients).map(([key, value]) => [
      key,
      value === null ? null : value * ratio,
    ]),
  ) as unknown as FoodCameraNutritionTotal
}

export function applyOptimisticConsumption(
  result: FoodCameraAnalyzeResult,
  consumedRatio: number,
): FoodCameraAnalyzeResult {
  if (!result.revision) return result
  const fullByItem = new Map(
    result.revision.items.map((item) => [item.analysisItemId, item]),
  )
  return {
    ...result,
    consumedRatio,
    eatenPercentage: consumedRatio * 100,
    total: scaleNutrients(result.revision.fullTotal, consumedRatio),
    foods: result.foods.map((food) => {
      const full = food.analysisItemId
        ? fullByItem.get(food.analysisItemId)
        : undefined
      return full
        ? {
            ...food,
            consumedGrams: full.analyzedGrams * consumedRatio,
            ...scaleNutrients(full.fullNutrients, consumedRatio),
          }
        : food
    }),
  }
}

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
    return { isValid: false, message: "식사 이름을 입력해 주세요" }
  }
  return { isValid: true, message: "" }
}

export function validateMenuName(
  name: string,
  invalidMessage = "음식 이름을 입력해 주세요",
): {
  isValid: boolean
  message: string
} {
  if (!name.trim()) {
    return { isValid: false, message: invalidMessage }
  }
  return { isValid: true, message: "" }
}

export function validateMenuAmount(
  amount: string,
  messages: {
    required: string
    positive: string
  } = {
    required: "먹은 양을 입력해 주세요",
    positive: "먹은 양은 0보다 큰 숫자로 입력해 주세요",
  },
): {
  isValid: boolean
  message: string
} {
  if (!amount.trim()) {
    return { isValid: false, message: messages.required }
  }
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return {
      isValid: false,
      message: messages.positive,
    }
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
  brothConsumedRatio?: number
  includeConsumptionContract?: boolean
  foods: EditableFoodItem[]
}): FoodAnalysisUpdateRequest {
  return {
    servings: input.servings,
    eatenPercentage: input.eatenPercentage,
    ...(input.includeConsumptionContract
      ? { consumedRatio: input.eatenPercentage / 100 }
      : {}),
    ...(input.includeConsumptionContract &&
    input.brothConsumedRatio !== undefined
      ? { brothConsumedRatio: input.brothConsumedRatio }
      : {}),
    foods: input.foods.map((food) => ({
      foodId: food.id,
      name: food.name.trim(),
      servingSizeValue: Number(food.amount) || 0,
      servingSizeUnit: food.unit,
    })),
  }
}

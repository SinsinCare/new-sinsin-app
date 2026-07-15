import type { FoodCameraAnalyzeResult } from "@/src/types"
import type {
  MealDiaryPersistenceInput,
  PersistedMealIdentity,
} from "./mealDiaryPersistence"

const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

export interface FoodConsultNavigation {
  pathname: "/(tabs)/consult"
  params: {
    foodConsultContext: string
    foodConsultRequestId: string
  }
}

interface MealConsultControllerDependencies {
  ensureDiary: (
    input: MealDiaryPersistenceInput,
  ) => Promise<PersistedMealIdentity>
  refreshHome: () => Promise<void>
  navigate: (navigation: FoodConsultNavigation) => void
  createRequestId?: (identity: PersistedMealIdentity) => string
}

interface SavedMealDeleteControllerDependencies {
  confirmDelete: () => Promise<boolean>
  deleteDiary: (diaryId: number) => Promise<void>
  refreshHome: () => Promise<void>
}

function buildFoodConsultContext(
  result: FoodCameraAnalyzeResult,
  identity: PersistedMealIdentity,
  mealType?: string,
): string {
  return JSON.stringify({
    diaryId: identity.diaryId,
    analysisId: identity.analysisId,
    foodAnalysisResultId: identity.foodAnalysisResultId,
    mealType,
    mealLabel: mealType ? MEAL_LABEL[mealType] : undefined,
    title: result.title,
    servings: result.servings,
    total: result.total,
    comment: result.evaluation.comment,
    cautionFoods: result.evaluation.cautionFoods.map((item) => ({
      food: item.food,
      reason: item.reason,
    })),
    foods: result.foods.map((food) => ({
      name: food.name,
      servingSizeValue: food.servingSizeValue,
      servingSizeUnit: food.servingSizeUnit,
      restrictionLevel: food.restrictionLevel,
      calories: food.calories,
      protein: food.protein,
      carbohydrates: food.carbohydrates,
      fat: food.fat,
      sodium: food.sodium,
      potassium: food.potassium,
      phosphorus: food.phosphorus,
      water: food.water,
    })),
  })
}

export function createMealConsultController(
  dependencies: MealConsultControllerDependencies,
) {
  let inFlight: Promise<PersistedMealIdentity> | null = null

  const start = (
    input: MealDiaryPersistenceInput,
  ): Promise<PersistedMealIdentity> => {
    if (inFlight) return inFlight

    let operation: Promise<PersistedMealIdentity>
    operation = dependencies
      .ensureDiary(input)
      .then(async (identity) => {
        if (identity.wasCreated) await dependencies.refreshHome()
        dependencies.navigate({
          pathname: "/(tabs)/consult",
          params: {
            foodConsultContext: buildFoodConsultContext(
              input.result,
              identity,
              input.mealType,
            ),
            foodConsultRequestId:
              dependencies.createRequestId?.(identity) ??
              `${identity.diaryId}-${identity.analysisId}-${Date.now()}`,
          },
        })
        return identity
      })
      .finally(() => {
        if (inFlight === operation) inFlight = null
      })
    inFlight = operation
    return operation
  }

  return { start }
}

export function createSavedMealDeleteController(
  dependencies: SavedMealDeleteControllerDependencies,
) {
  let inFlight: Promise<boolean> | null = null

  const remove = (diaryId: number): Promise<boolean> => {
    if (inFlight) return inFlight
    let operation: Promise<boolean>
    operation = dependencies
      .confirmDelete()
      .then(async (confirmed) => {
        if (!confirmed) return false
        await dependencies.deleteDiary(diaryId)
        await dependencies.refreshHome()
        return true
      })
      .finally(() => {
        if (inFlight === operation) inFlight = null
      })
    inFlight = operation
    return operation
  }

  return { remove }
}

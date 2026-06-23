import type { DateAnalysisDiet } from "@/src/types"
import type { MealType } from "../types"

export type MealButtonAction = "record" | "view"

export function isSkippedDiet(diet: DateAnalysisDiet): boolean {
  return diet.isSkipped === true || diet.diaryId === null
}

export function toSkippedMealMap(
  diets: DateAnalysisDiet[],
): Partial<Record<MealType, boolean>> {
  return Object.fromEntries(
    diets.filter(isSkippedDiet).map((diet) => [diet.mealType, true]),
  ) as Partial<Record<MealType, boolean>>
}

export function getMealButtonAction({
  isRecorded,
  isSkipped,
}: {
  isRecorded: boolean
  isSkipped: boolean
}): MealButtonAction {
  return isRecorded && !isSkipped ? "view" : "record"
}

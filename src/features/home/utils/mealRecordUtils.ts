import type { DateAnalysisDiet } from "@/src/types"
import type { MealType } from "../types"

export type RecordedMealMap = Partial<Record<MealType, boolean>>

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

export function applyMealTypeChangeToRecordedMeals({
  current,
  fromMealType,
  toMealType,
}: {
  current: RecordedMealMap
  fromMealType: MealType
  toMealType: MealType
}): RecordedMealMap {
  if (fromMealType === toMealType) return current

  return {
    ...current,
    [fromMealType]: false,
    [toMealType]: true,
  }
}

/**
 * 지금 시각으로 끼니를 먼저 골라 둔다 — 대부분은 기본값을 그대로 두므로
 * 계산 가능한 값은 앱이 채운다(디폴트 효과). 경계는 식사 시간대의 통념을 따른다.
 */
export function inferMealTypeFromTime(now: Date): MealType {
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < 10 * 60 + 30) return "BREAKFAST"
  if (minutes < 15 * 60) return "LUNCH"
  if (minutes < 21 * 60) return "DINNER"
  return "SNACKS"
}

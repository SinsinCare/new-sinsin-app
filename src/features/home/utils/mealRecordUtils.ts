import type { DateAnalysisDiet } from "@/src/types"
import type { MealType } from "../types"

export type MealButtonAction = "record" | "view"
export type MealImageMap = Partial<Record<MealType, string | null>>
export type RecordedMealMap = Partial<Record<MealType, boolean>>

export interface MealRecordStatusPresentation {
  isRecorded: boolean
  text: string
}

export function getMealRecordStatusPresentation({
  hasRecord,
  streak,
  isToday,
}: {
  hasRecord: boolean
  streak: number
  isToday: boolean
}): MealRecordStatusPresentation {
  if (!hasRecord) {
    return {
      isRecorded: false,
      text: isToday ? "오늘은 식사 기록이 없어요" : "이날은 식사 기록이 없어요",
    }
  }

  if (isToday && streak > 0) {
    return {
      isRecorded: true,
      text: `${streak}일째 기록 중`,
    }
  }

  return {
    isRecorded: true,
    text: isToday ? "오늘 식사를 기록했어요" : "이날 식사를 기록했어요",
  }
}

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

export function getMealTimeLabel({
  isSkipped,
  time,
}: {
  isSkipped: boolean
  time?: string
}): string | undefined {
  return isSkipped ? "건너뜀" : time
}

export function applyMealTypeChangeToMealImages({
  current,
  fromMealType,
  toMealType,
  imageUri,
}: {
  current: MealImageMap
  fromMealType: MealType
  toMealType: MealType
  imageUri?: string | null
}): MealImageMap {
  if (fromMealType === toMealType) return current

  return {
    ...current,
    [fromMealType]: null,
    [toMealType]: imageUri ?? current[fromMealType] ?? null,
  }
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

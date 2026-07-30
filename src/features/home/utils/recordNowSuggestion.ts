import type {
  DateAnalysisBloodGlucoseRecord,
  DateAnalysisDiet,
} from "@/src/types"
import { isSkippedDiet } from "./mealRecordUtils"

const AFTER_MEAL_WINDOW_START_MS = 2 * 60 * 60 * 1000
/** 식후 6시간이 지나면 "지금"이라고 조르지 않는다 — 이미 다음 끼니의 시간이다. */
const AFTER_MEAL_WINDOW_END_MS = 6 * 60 * 60 * 1000

export interface GlucoseNowSuggestion {
  highlight: boolean
  caption: string | null
}

/**
 * 혈당 타일의 "지금" 판정 — 신장 환자의 하루에서 가장 놓치기 쉬운 지점 하나만 짚는다:
 * 아침을 먹고 2시간이 지났는데 오늘 식후 혈당이 없다면, 지금이 잴 때다.
 *
 * 서버 createdAt 은 UTC(naive) 문자열이라 "Z" 를 붙여 해석한다
 * (RecordView 의 식사 시간 표기와 같은 규칙).
 */
export function getGlucoseNowSuggestion({
  diets,
  bloodGlucose,
  now,
  language = "ko",
}: {
  diets: DateAnalysisDiet[]
  bloodGlucose: DateAnalysisBloodGlucoseRecord[]
  now: Date
  language?: "ko" | "en"
}): GlucoseNowSuggestion {
  const hasAfterMealRecord = bloodGlucose.some(
    (record) => record.timing === "AFTER_MEAL",
  )
  if (hasAfterMealRecord) return { highlight: false, caption: null }

  const breakfast = diets.find(
    (diet) => diet.mealType === "BREAKFAST" && !isSkippedDiet(diet),
  )
  if (!breakfast) return { highlight: false, caption: null }

  const eatenAt = new Date(
    breakfast.createdAt.endsWith("Z")
      ? breakfast.createdAt
      : breakfast.createdAt + "Z",
  )
  if (isNaN(eatenAt.getTime())) return { highlight: false, caption: null }

  const elapsed = now.getTime() - eatenAt.getTime()
  if (
    elapsed < AFTER_MEAL_WINDOW_START_MS ||
    elapsed > AFTER_MEAL_WINDOW_END_MS
  ) {
    return { highlight: false, caption: null }
  }

  return {
    highlight: true,
    caption:
      language === "en"
        ? "It’s time to check your blood sugar after breakfast"
        : "아침 식사 후 혈당을 잴 때예요",
  }
}

import type { DateAnalysisDiet } from "@/src/types"
import { isSkippedDiet } from "./mealRecordUtils"
import type {
  GlucoseElapsed,
  GlucoseTiming,
} from "../data/bloodMetricsConstants"
import type { MealType } from "../types"

/** 식후로 보는 상한. 마지막 끼니에서 이 시간이 지나면 이미 다음 끼니의 시간이다. */
const AFTER_MEAL_MAX_MS = 6 * 60 * 60 * 1000
/** 이 전이면 아직 아침 전 — 공복 측정의 시간대다. */
const FASTING_HOUR_END = 11

export interface GlucoseContextInference {
  timing: GlucoseTiming
  elapsed: GlucoseElapsed | null
  /** 추론의 근거 끼니. 라벨은 화면이 `t("meal.<type>")` 로 그린다. */
  mealType: MealType | null
  /** 근거 끼니를 기록한 시각("09:12"). 없으면 시간 없는 추론(공복)이다. */
  mealTime: string | null
}

/**
 * 혈당 측정 시점 추론 — "시점은 앱이 먼저 안다"(시트 시안 2026-08-03).
 *
 * 09:12 에 아침 기록이 있으면 "아침 식후"는 사용자에게 물을 값이 아니라
 * **계산 가능한 값**이다. 추론을 기본값으로 먼저 제시하고, 틀렸을 때만 고치게
 * 한다 — 시점 기본값의 정확도가 곧 데이터 품질이다.
 *
 * 계산할 수 없으면 null 을 돌려준다. 추측을 "자동"이라고 붙이는 순간
 * 자동 라벨 전체를 의심하게 되므로, 근거 없는 추론은 만들지 않는다:
 * - 오늘 끼니 기록이 있고 6시간 안 → 식후 + 경과(30분/1시간/2시간)
 * - 끼니 기록이 없는 오전(11시 전) → 공복
 * - 그 외 → null (기본값 공복, "자동" 표시는 없다)
 */
export function inferGlucoseContext({
  diets,
  now,
}: {
  diets: DateAnalysisDiet[]
  now: Date
}): GlucoseContextInference | null {
  const eaten = diets
    .filter((diet) => !isSkippedDiet(diet))
    .map((diet) => {
      // 서버 createdAt 은 UTC(naive) 문자열 — "Z" 를 붙여야 현지 시각이 맞는다
      // (RecordView 의 식사 시간 표기와 같은 규칙).
      const at = new Date(
        diet.createdAt.endsWith("Z") ? diet.createdAt : diet.createdAt + "Z",
      )
      return { diet, at }
    })
    .filter(({ at }) => !isNaN(at.getTime()) && at.getTime() <= now.getTime())
    .sort((a, b) => b.at.getTime() - a.at.getTime())

  const latest = eaten[0] ?? null

  if (!latest) {
    if (now.getHours() < FASTING_HOUR_END) {
      return {
        timing: "FASTING",
        elapsed: null,
        mealType: null,
        mealTime: null,
      }
    }
    return null
  }

  const elapsedMs = now.getTime() - latest.at.getTime()
  if (elapsedMs > AFTER_MEAL_MAX_MS) return null

  const elapsed: GlucoseElapsed =
    elapsedMs < 45 * 60 * 1000
      ? "30M"
      : elapsedMs < 90 * 60 * 1000
        ? "1H"
        : "2H"

  const hours = String(latest.at.getHours()).padStart(2, "0")
  const minutes = String(latest.at.getMinutes()).padStart(2, "0")

  return {
    timing: "AFTER_MEAL",
    elapsed,
    mealType: latest.diet.mealType,
    mealTime: `${hours}:${minutes}`,
  }
}

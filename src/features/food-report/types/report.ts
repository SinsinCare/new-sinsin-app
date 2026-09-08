/**
 * 한 끼 리포트 응답 계약.
 *
 * 키는 백엔드 `ReportFacts.to_dict()` / `Insight.to_dict()` 를 그대로 따른다.
 * **여기서 숫자를 다시 만들지 않는다** — `remainingText` 같은 표시용 문자열까지
 * 서버가 만들어 보낸다. 화면이 자기 식대로 반올림하면 헤드라인의 숫자와
 * 막대 옆 숫자가 어긋난다.
 */

/** `UNKNOWN` 은 영양이 아직 확인되지 않은 항목(서버 PENDING) — 제한이 아니라 "모름" 이다. */
export type VerdictLevel = "SAFE" | "CAUTION" | "RESTRICTED" | "UNKNOWN"
export type FocusLevel = "OVER" | "TIGHT" | "OK"
export type InsightSource = "AI" | "FALLBACK"

export interface ReportFocus {
  nutrient: string
  nutrientLabel: string
  level: FocusLevel
}

export interface ReportBudget {
  nutrient: string
  label: string
  /**
   * 칼륨·인처럼 혈청 수치 없이는 단정할 수 없는 쪽인지(화면 표기는 "권장량", 2026-09-03).
   * 이런 영양소는 "남음" 같은 예산 언어 대신 권장량 대비 여유로 말한다.
   */
  isReference: boolean
  /** 체중 미기록이면 null. 이때 이 행은 그리지 않는다 — 한도를 지어내지 않는다. */
  limit: number | null
  /** 한도 표기("30g"). limit 이 null 이면 null. */
  limitText: string | null
  beforeThisMeal: number
  thisMeal: number
  consumed: number
  /** 이 끼니까지 포함한 오늘 누적 표기("39.6g"). */
  consumedText: string
  remaining: number
  remainingText: string
  over: number
  overText: string | null
  /** 0~1. limit 이 null 이면 null. */
  usedRatio: number | null
  isOver: boolean
}

export interface ReportSplit {
  nutrient: string
  past: number
  pastText: string
  pastLabel: string
  current: number
  currentText: string
  currentLabel: string
  remaining: number
  remainingShare: number
  remainingShareText: string
  remainingLabel: string
  remainingMeals: string[]
  isLastMeal: boolean
}

export interface ReportFoodFact {
  name: string
  grams: number | null
  level: VerdictLevel
  levelLabel: string
  /** 이 음식에서 가장 문제되는 지표. 없으면 null. */
  nutrient: string | null
  nutrientLabel: string | null
  amount: number
  amountText: string | null
  sharePercent: number
  /** 하루 기준 대비 이 음식 하나의 비중(%). 한도를 모르면 null. */
  dailyPercent: number | null
  hasPhosphateAdditive: boolean
}

export interface ReportSwap {
  fromName: string
  toName: string
  nutrient: string
  nutrientLabel: string
  delta: number
  deltaText: string
}

/** v2(서버 2026-09-04) — 끼니별 집중 영양소 섭취(이 끼니 포함). 시안의 범례·막대 재료. */
export interface ReportMealAmount {
  mealType: string
  label: string
  amount: number
  amountText: string
  isCurrent: boolean
}

/** v2 — 집중 영양소를 가장 많이 낸 재료. "오리고기에서만 420mg 나타나요". */
export interface ReportTopContributor {
  name: string
  amount: number
  amountText: string
  sharePercent: number
}

export interface ReportFacts {
  mealType: string | null
  mealName: string
  ckdStageLabel: string
  isRecorded: boolean
  focus: ReportFocus | null
  budgets: ReportBudget[]
  split: ReportSplit | null
  mealVerdict: { level: VerdictLevel; label: string; driver: string | null }
  foods: ReportFoodFact[]
  swaps: ReportSwap[]
  cookingTip: string
  mealTotal: Record<string, number>
  /** 이 끼니 열량이 체중으로 계산한 참고값에서 차지하는 비율. 체중을 모르면 null. */
  energyPercent: number | null
  /** 구서버 응답에는 없다 — 없으면 앱이 split 로 그린다. */
  mealsToday?: ReportMealAmount[]
  topContributor?: ReportTopContributor | null
}

export interface ReportProse {
  headline: string
  evidence: string[]
  plainly: string
  /** 음식 이름 → 한 줄 설명. 모델이 못 붙인 음식은 키가 없다. */
  foodNotes: Record<string, string>
  swapTip: string
  /** v11 — 다음 식사로 제안하는 음식 조합과 선택 이유. 음식 허용량 환산이 아니다. */
  remainingTip?: string
  source: InsightSource
}

export interface MealReport {
  foodAnalysisResultId: number
  mealType: string | null
  reportDate: string | null
  focusNutrient: string | null
  source: InsightSource
  policyVersion: string | null
  facts: ReportFacts
  prose: ReportProse
}

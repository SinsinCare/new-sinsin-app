/**
 * 한 끼 리포트 응답 계약.
 *
 * 키는 백엔드 `ReportFacts.to_dict()` / `Insight.to_dict()` 를 그대로 따른다.
 * **여기서 숫자를 다시 만들지 않는다** — `remainingText` 같은 표시용 문자열까지
 * 서버가 만들어 보낸다. 화면이 자기 식대로 반올림하면 헤드라인의 숫자와
 * 막대 옆 숫자가 어긋난다.
 */

export type VerdictLevel = "SAFE" | "CAUTION" | "RESTRICTED"
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
   * 칼륨·인처럼 혈청 수치 없이는 단정할 수 없는 "참고 기준"인지.
   * 참고 기준은 "남음" 같은 예산 언어 대신 기준 대비 여유로 말한다.
   */
  isReference: boolean
  /** 체중 미기록이면 null. 이때 이 행은 그리지 않는다 — 한도를 지어내지 않는다. */
  limit: number | null
  beforeThisMeal: number
  thisMeal: number
  consumed: number
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
  /** 이 끼니 열량이 체중 기반 참고값에서 차지하는 비율. 체중을 모르면 null. */
  energyPercent: number | null
}

export interface ReportProse {
  headline: string
  evidence: string[]
  plainly: string
  /** 음식 이름 → 한 줄 설명. 모델이 못 붙인 음식은 키가 없다. */
  foodNotes: Record<string, string>
  swapTip: string
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

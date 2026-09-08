import type {
  MealReport,
  VerdictLevel,
} from "@/src/features/food-report/types/report"

/**
 * 시안(`write.svg`)의 문장 틀을 서버 **수치**(facts)로 조립한다.
 *
 * 서버 `prose` 는 AI 가 쓴 자유 문장이라 시안과 결이 다르다("오늘 나트륨이 하루 기준
 * 2,000mg을 1,100mg 넘겼어요"). 시안은 틀이 고정이다:
 *   헤드라인  "섭취 칼륨이 880mg 남았어요"          ← 집중 영양소의 남은 양(넘겼으면 "넘었어요")
 *   범례      이전 섭취 · 식사 · 하루 기준까지           ← 시간대와 무관한 실제 섭취 구분
 *   막대      880 | 620 | 880                          ← 지난 끼니 섭취 / 이번 끼니 / 남은 양
 *   근거 1    "이번에 드신 만큼이 칼륨 620mg이에요"
 *   근거 2    "오리고기에서만 420mg 나타나요"          ← 그 영양소를 가장 많이 낸 음식
 *   배지      안전 / 주의 / 제한                       ← 판정 단계
 * 숫자는 서버 표시 문자열(remainingText 등)을 그대로 쓴다 — 여기서 반올림하지 않는다.
 * 재료가 없으면(집중 영양소 없음 등) null 을 돌려 화면이 서버 문장으로 물러선다.
 */

export interface ReportSegment {
  key: "past" | "current" | "remaining"
  label: string
  value: number
  text: string
}

export interface ReportCopy {
  headline: string
  segments: ReportSegment[]
  evidence: string[]
}

export type Translate = (
  key: string,
  values?: Record<string, unknown>,
) => string

/** 분석 결과의 재료 한 줄 — 집중 영양소를 가장 많이 낸 재료를 고르는 데 쓴다(DB 재료 합 기준). */
export interface ReportIngredient {
  name: string
  potassium: number | null
  sodium: number | null
  phosphorus: number | null
  protein: number | null
}

export function buildReportCopy(
  report: MealReport,
  t: Translate,
  ingredients: ReportIngredient[] = [],
): ReportCopy | null {
  const { facts } = report
  const focus = facts.focus
  if (!focus) return null
  const budget = facts.budgets.find((b) => b.nutrient === focus.nutrient)
  if (!budget || budget.limit === null) return null

  const headline = budget.isOver
    ? t("foodResult.copy.headlineOver", {
        nutrient: focus.nutrientLabel,
        amount: budget.overText ?? budget.remainingText,
      })
    : t("foodResult.copy.headlineRemaining", {
        nutrient: focus.nutrientLabel,
        amount: budget.remainingText,
      })

  const split = facts.split
  const segments: ReportSegment[] = []
  // The chart compares actual intake, this meal and remaining reference amount.
  // Meal slots stay in data, but are not presented as a guessed breakfast/lunch/snack label.
  if (split) {
    if (split.past > 0)
      segments.push({
        key: "past",
        label: t("foodResult.previousMeals"),
        value: split.past,
        text: split.pastText,
      })
    segments.push({
      key: "current",
      label: t("foodResult.meal"),
      value: split.current,
      text: split.currentText,
    })
    if (split.remaining > 0 && !split.isLastMeal)
      segments.push({
        key: "remaining",
        label: t("foodResult.remainingBudget"),
        value: split.remaining,
        text: budget.remainingText,
      })
  }

  const evidence: string[] = [
    t("foodResult.copy.thisMeal", {
      nutrient: focus.nutrientLabel,
      amount:
        split?.currentText ?? formatLike(budget.thisMeal, budget.remainingText),
    }),
  ]
  /*
    ── 두 번째 줄은 **새 정보일 때만** ──────────────────────────────────────
    재료가 하나뿐이면 "우유에서만 90mg" 은 바로 윗줄과 같은 말이다(2026-09-05 피드백).
    재료가 둘 이상이고, 그 하나가 이 끼니의 절반을 넘게 낼 때만 덧붙인다 — 그때부터
    "무엇 때문인지" 가 정보가 된다.
  */
  const worthNaming = facts.foods.length > 1
  const topFood = facts.foods
    .filter((f) => f.nutrient === focus.nutrient && f.amountText)
    .sort((a, b) => b.amount - a.amount)[0]
  if (!worthNaming) {
    // 한 줄로 끝낸다.
  } else if (
    facts.topContributor?.amountText &&
    facts.topContributor.sharePercent >= 50
  ) {
    // 서버 v2 가 고른 최대 기여 재료가 정본이다.
    evidence.push(
      t("foodResult.copy.topFood", {
        food: facts.topContributor.name,
        amount: facts.topContributor.amountText,
      }),
    )
  } else if (topFood?.amountText && topFood.sharePercent >= 50) {
    evidence.push(
      t("foodResult.copy.topFood", {
        food: topFood.name,
        amount: topFood.amountText,
      }),
    )
  } else if (worthNaming) {
    // 리포트가 그 영양소로 음식을 안 골랐으면 재료 값에서 직접 고른다(DB 재료 합의 최대 기여).
    const key = focus.nutrient as keyof Omit<ReportIngredient, "name">
    const ranked = ingredients
      .filter((i) => (i[key] ?? 0) > 0)
      .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
    const top = ranked[0]
    const sum = ranked.reduce((acc, row) => acc + (row[key] ?? 0), 0)
    if (top && sum > 0 && (top[key] ?? 0) / sum >= 0.5) {
      evidence.push(
        t("foodResult.copy.topFood", {
          food: top.name,
          amount: formatLike(top[key] ?? 0, budget.remainingText),
        }),
      )
    }
  }

  return { headline, segments, evidence }
}

/** 서버가 이 끼니 몫의 문자열을 안 줄 때, 같은 단위 표기를 흉내 낸다("30g"/"880mg"). */
function formatLike(value: number, sample: string): string {
  const unit = /[a-z]+$/iu.exec(sample)?.[0] ?? ""
  const rounded = unit === "g" ? Math.round(value * 10) / 10 : Math.round(value)
  return `${rounded.toLocaleString()}${unit}`
}

/** 배지 글자 — 서버 라벨("기준 안") 대신 시안의 세 단어(안전/주의/제한). */
export function verdictLabel(level: VerdictLevel, t: Translate): string {
  if (level === "SAFE") return t("foodResult.copy.safe")
  if (level === "CAUTION") return t("foodResult.copy.caution")
  // 모름은 "조절 필요" 가 아니다 — 영양이 확인되지 않은 항목을 제한으로 읽게 하면 안 된다(2026-09-05).
  if (level === "UNKNOWN") return t("foodResult.copy.unknown")
  return t("foodResult.copy.restricted")
}

/** 분석 항목 중 영양이 확정된 것만(서버 PENDING 제외). */
export function isNutritionReliable<
  T extends { nutritionStatus?: string | null },
>(food: T): boolean {
  return food.nutritionStatus !== "PENDING"
}

/**
 * DB 재료 합. PENDING 항목은 값이 없으므로 **빼고** 더한다(서버 `totalFromFoods` 와 같은 규칙).
 * 항목이 있는데 확정된 것이 하나도 없으면 null — 0 은 "안 먹었다" 지 "모른다" 가 아니다.
 * 항목이 아예 없으면 null(호출부가 서버 합계로 물러선다).
 */
export function sumReliableNutrient<
  T extends { nutritionStatus?: string | null },
>(
  foods: readonly T[],
  pick: (food: T) => number | null | undefined,
): number | null {
  const reliable = foods.filter(isNutritionReliable)
  if (reliable.length === 0) return null
  return reliable.reduce((sum, food) => sum + (pick(food) ?? 0), 0)
}

/**
 * 서버가 추천 식단을 주지 못하면 실패 상태를 표시한다. 영양소 허용량을 추천처럼 만들지 않는다.
 * 집중 영양소가 없으면 null(카드를 접는다).
 */
export function recommendationFallback(
  report: MealReport,
  t: Translate,
): string | null {
  const { facts } = report
  const focus = facts.focus
  if (!focus) return null
  const budget = facts.budgets.find((b) => b.nutrient === focus.nutrient)
  if (!budget || budget.limit === null) return null
  return t("foodResult.copy.tipUnavailable")
}

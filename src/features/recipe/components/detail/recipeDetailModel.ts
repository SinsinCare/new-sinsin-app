/**
 * 상세 화면의 순수 계산부. RN·Tamagui 를 import 하지 않는다 — 그래서 node 환경
 * jest(`tests/recipeDetailV2.test.ts`)가 이 파일을 그대로 돌린다.
 *
 * ─── 인분 조절의 기준 (여기서 한 번만 정한다) ───────────────────────────────
 * 계약 §3.3: `nutrition` 은 **1인분 기준**이고, `ingredients[].grams` 는 **원문 표기의
 * 그램**(= 레시피 전체가 만들어 내는 `servings` 인분에 필요한 양)이다. 두 기준이 다르므로
 * 배율도 둘이다:
 *
 *   재료 배율   = 고른 인분 / 원본 인분   (`ingredientScale`)
 *   영양 배율   = 고른 인분             (`nutritionScale`)
 *
 * 스테퍼의 시작값은 **원본 인분**이다. 기본 상태에서 재료가 원문 표기 그대로 보여야
 * 하기 때문이다 — 2인분 레시피를 열었는데 재료가 절반으로 적혀 있으면 앱이 원문을
 * 고쳐 쓴 것이 되고, 사용자가 다른 곳의 같은 레시피와 비교할 때 숫자가 어긋난다.
 * 그래서 기본 상태의 영양 카드는 "2인분 기준" 이라고 **기준을 글자로 적고** 그 값을 보인다.
 * (§6.4 "결과 예측 가능": 무엇을 기준으로 한 숫자인지 화면에 적혀 있어야 한다.)
 *
 * ─── 지어내지 않는 것 ────────────────────────────────────────────────────
 * - `grams` 가 null 인 재료(소량·1개)는 배율을 곱하지 않는다. 원문 표기를 그대로 두고
 *   조절 대상이 아님을 회색으로 보인다. 추정으로 채우면 CKD 환자에게 나트륨을 지어내는 것이다.
 * - 원본 인분을 모르면(`servings == null`) 재료 배율을 만들 수 없다. 1인분이라고 가정하지
 *   않고 **조절 UI 를 아예 숨긴다**(`isServingAdjustable`).
 * - `provenance` 가 계약에 없는 값이면 `resolveProvenance` 가 null 을 준다. 영양 카드는
 *   그때 수치를 그리지 않는다(계약 §1.1).
 */
import {
  type IngredientMatchReason,
  RECIPE_NUTRITION_PROVENANCES,
  type NutrientHeadline,
  type NutrientKey,
  type RatingSummary,
  type RecipeIngredient,
  type RecipeNutrition,
  type RecipeNutritionProvenance,
} from "../../types/recipeV2"

/** 계약 §3.6 `servings` 1~20. 스테퍼도 같은 범위를 넘지 않는다. */
export const SERVINGS_MIN = 1
export const SERVINGS_MAX = 20

/** 계약 §3.2 `percentOfRemaining` 은 0~999 다. 화면 표기도 여기서 잘린다. */
export const PERCENT_MAX = 999

/**
 * 라우트 파라미터 → 레시피 id.
 * **십진 정규식으로 먼저 거른다** — `Number("0x10") === 16` 이라 `parseInt`/`Number` 만 쓰면
 * `/recipe/0x10` 이 16번 레시피를 연다. 서버 규약(`pathIntOrThrow`)과 같은 규칙이다.
 */
export function parseRecipeId(
  raw: string | string[] | undefined,
): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== "string" || !/^\d{1,9}$/u.test(value)) return null
  const parsed = Number(value)
  return parsed > 0 ? parsed : null
}

export function clampServings(value: number): number {
  if (!Number.isFinite(value)) return SERVINGS_MIN
  return Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, Math.round(value)))
}

/**
 * 인분 조절을 열어도 되는가.
 * 원본 인분을 알고, 비례시킬 수 있는 재료가 하나라도 있어야 한다.
 */
export function isServingAdjustable(input: {
  servings: number | null
  ingredients: readonly Pick<RecipeIngredient, "grams">[]
}): boolean {
  if (input.servings == null || input.servings <= 0) return false
  return input.ingredients.some((item) => item.grams != null)
}

/** 재료 배율. 원본 인분을 모르면 1(=원문 그대로). */
export function ingredientScale(
  baseServings: number | null,
  selectedServings: number,
): number {
  if (baseServings == null || baseServings <= 0) return 1
  return clampServings(selectedServings) / baseServings
}

/** 영양 배율. 응답이 1인분 기준이므로 고른 인분이 그대로 배율이다. */
export function nutritionScale(selectedServings: number): number {
  return clampServings(selectedServings)
}

export interface ScaledIngredient extends RecipeIngredient {
  /** 인분 조절 대상인가(= grams 가 있는가) */
  scalable: boolean
  /** 조절된 그램. 조절 대상이 아니면 null. */
  scaledGrams: number | null
  /** 화면에 그릴 수량 문자열 */
  displayAmount: string
}

/**
 * 배율이 1 이면 **원문 표기를 그대로** 보인다. `15ml` 를 `15g` 로 바꿔 적으면
 * 계약 §3.3("원문 표기 그대로")을 어기고 사용자가 원문과 대조할 수 없다.
 * 배율이 1 이 아닐 때만 계산된 그램으로 바꾼다.
 */
export function scaleIngredient(
  ingredient: RecipeIngredient,
  scale: number,
): ScaledIngredient {
  const scalable = ingredient.grams != null
  const scaledGrams = scalable ? (ingredient.grams as number) * scale : null
  const displayAmount =
    scaledGrams == null || scale === 1
      ? ingredient.amountText
      : `${formatGrams(scaledGrams)}g`
  return { ...ingredient, scalable, scaledGrams, displayAmount }
}

export function scaleIngredients(
  ingredients: readonly RecipeIngredient[],
  scale: number,
): ScaledIngredient[] {
  return ingredients.map((ingredient) => scaleIngredient(ingredient, scale))
}

/** 그램 표기. 소수 한 자리까지만 남긴다(그 아래는 재료 계량의 의미가 없다). */
export function formatGrams(grams: number): string {
  const rounded = Math.round(grams * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** 영양 수치 배율. `provenance`·`unmatchedIngredients` 는 배율과 무관하게 유지된다. */
export function scaleNutrition(
  nutrition: RecipeNutrition,
  scale: number,
): RecipeNutrition {
  return {
    ...nutrition,
    kcal: nutrition.kcal * scale,
    proteinG: nutrition.proteinG * scale,
    sodiumMg: nutrition.sodiumMg * scale,
    potassiumMg: nutrition.potassiumMg * scale,
    phosphorusMg: nutrition.phosphorusMg * scale,
  }
}

/**
 * 참고량 대비 비율도 같이 비례시킨다 — 인분을 늘렸는데 비율이 그대로면
 * 사용자가 "2인분 먹어도 24%" 로 읽는다. null(계산 불가)은 null 로 남긴다.
 */
export function scaleHeadline(
  headline: NutrientHeadline,
  scale: number,
): NutrientHeadline {
  return {
    ...headline,
    amount: headline.amount * scale,
    percentOfRemaining:
      headline.percentOfRemaining == null
        ? null
        : headline.percentOfRemaining * scale,
  }
}

export function scaleBreakdown(
  breakdown: readonly NutrientHeadline[],
  scale: number,
): NutrientHeadline[] {
  return breakdown.map((headline) => scaleHeadline(headline, scale))
}

/** 계약 §3.2 순서(나트륨·칼륨·인·단백질)로 정렬하고 중복 키는 첫 것만 남긴다. */
export function orderBreakdown(
  breakdown: readonly NutrientHeadline[],
  order: readonly NutrientKey[],
): NutrientHeadline[] {
  const seen = new Set<NutrientKey>()
  const result: NutrientHeadline[] = []
  for (const key of order) {
    const found = breakdown.find((item) => item.key === key)
    if (found && !seen.has(key)) {
      seen.add(key)
      result.push(found)
    }
  }
  return result
}

/**
 * 서버가 `nutrientBreakdown` 을 비워 보냈을 때의 폴백. 절대값만 만들고
 * `percentOfRemaining` 은 **null 로 둔다** — 참고량을 모르는 채 비율을 지어내지 않는다.
 */
export function deriveBreakdown(
  nutrition: RecipeNutrition,
): NutrientHeadline[] {
  const base: Omit<NutrientHeadline, "percentOfRemaining">[] = [
    { key: "sodium", amount: nutrition.sodiumMg, unit: "mg" },
    { key: "potassium", amount: nutrition.potassiumMg, unit: "mg" },
    { key: "phosphorus", amount: nutrition.phosphorusMg, unit: "mg" },
    { key: "protein", amount: nutrition.proteinG, unit: "g" },
  ]
  return base.map((item) => ({ ...item, percentOfRemaining: null }))
}

/**
 * 영양 카드가 실제로 그릴 breakdown 을 고른다(배율 적용 **전**).
 *
 * 계약 §3.3 은 `nutrientBreakdown` 에 4개 영양소를 전부 담으라고 정했다. 그래도 서버가
 * 빈 배열을 보내는 경우를 여기서 받는다 — 그러면 영양 카드에 제목·출처 배지·열량만 남고
 * 나트륨·칼륨·인·단백질 네 줄이 **조용히 사라진다**. 그 네 줄이 이 앱의 존재 이유다(§6.1),
 * 그러니 값이 있는데 안 그리는 쪽이 잘못이다.
 *
 * `nutrition` 이 null 이면(= `provenance` 를 확인할 수 없으면) 빈 배열을 준다.
 * 출처를 모르는 수치를 폴백으로 살려 내면 §1.1 을 어긴다.
 */
export function breakdownForDisplay(
  breakdown: readonly NutrientHeadline[],
  nutrition: RecipeNutrition | null,
): NutrientHeadline[] {
  if (breakdown.length > 0) return [...breakdown]
  if (nutrition == null) return []
  return deriveBreakdown(nutrition)
}

/** 막대 채움 비율 0~1. 비율을 모르면 null → 막대를 그리지 않고 절대값만 보인다. */
export function barFillRatio(percentOfRemaining: number | null): number | null {
  if (percentOfRemaining == null) return null
  if (!Number.isFinite(percentOfRemaining)) return null
  return Math.min(1, Math.max(0, percentOfRemaining / 100))
}

/** 표기용 비율. 계약 상한 999 에서 자른다. */
export function formatPercent(percentOfRemaining: number): number {
  return Math.min(PERCENT_MAX, Math.max(0, Math.round(percentOfRemaining)))
}

/** 남은 참고량을 넘겼는가. 사실 진술이며 "위험" 판정이 아니다. */
export function isOverRemaining(percentOfRemaining: number | null): boolean {
  return percentOfRemaining != null && percentOfRemaining > 100
}

/** mg 는 정수, g 는 소수 한 자리(끝의 .0 은 지운다). */
export function formatNutrientAmount(amount: number, unit: "mg" | "g"): string {
  if (unit === "mg") return String(Math.round(amount))
  const rounded = Math.round(amount * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * 별점 영역을 그려도 되는가.
 * 계약 §6.1: 리뷰 0건이면 별점 영역을 **안 그린다**(0.0 을 만들지 않는다).
 */
export function hasRatings(rating: RatingSummary): boolean {
  return rating.count > 0 && rating.average != null
}

export function formatAverage(average: number): string {
  return (Math.round(average * 10) / 10).toFixed(1)
}

export interface DistributionRow {
  star: 1 | 2 | 3 | 4 | 5
  amount: number
  /** 최다 구간을 1 로 둔 상대 길이. 전부 0 이면 0. */
  ratio: number
}

/** 5점 → 1점 순. 막대 길이는 전체 대비가 아니라 최다 구간 대비다(짧은 막대가 안 사라진다). */
export function distributionRows(rating: RatingSummary): DistributionRow[] {
  const max = Math.max(...rating.distribution, 0)
  const stars: DistributionRow["star"][] = [5, 4, 3, 2, 1]
  return stars.map((star) => {
    const amount = rating.distribution[star - 1] ?? 0
    return { star, amount, ratio: max > 0 ? amount / max : 0 }
  })
}

/** 타이머 표기 `m:ss`. 60분을 넘으면 분이 계속 커진다(요리 단계에 시:분:초는 과하다). */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/**
 * 계약 §1.2 임상 토큰. 서버가 이미 걸러서 보내지만(`displayTags`), 상세 화면이 한 번 더 막는다.
 * 검수 전 카탈로그가 "저염" 딱지를 달면 그 자체가 임상 주장이고, 그 사고는 서버 한 곳의
 * 실수로 전 화면에 퍼진다. 필터는 화면 표시에만 쓴다 — 필터 질의로는 여전히 유효한 말이다(§1.2).
 */
const CLINICAL_TAG_TOKENS = [
  "저염",
  "저단백",
  "저칼륨",
  "저인",
  "고열량",
  "투석",
  "당뇨",
  "고혈압",
  "신장",
  "콩팥",
  "ckd",
  "dialysis",
  "diabetes",
  "diabetic",
  "hypertension",
  "kidney",
  "renal",
  "lowsalt",
  "lowsodium",
  "lowprotein",
  "lowpotassium",
  "lowphosphorus",
  "highcalorie",
] as const

/** 표시용 태그만 남긴다. 판단이 아니라 문자열 검사다. */
export function filterClinicalTags(tags: readonly string[]): string[] {
  return tags.filter((tag) => {
    const normalized = tag
      .toLowerCase()
      .replace(/^#+/u, "")
      .replace(/[\s\-_]/gu, "")
    return !CLINICAL_TAG_TOKENS.some((token) => normalized.includes(token))
  })
}

/**
 * 표시할 태그 — 임상 토큰을 걷어낸 뒤 **카테고리와 같은 태그도 뺀다.**
 *
 * 실측(2026-07-31, dev DB 175건 전수): `tags_json` 은 전부
 * `["#저염식", "#CKD3", "#한식"]` 꼴이고 `filterClinicalTags` 가 앞의 둘을 지운다.
 * 남는 하나는 **175/175 모두 카테고리와 글자까지 같았다**(`#한식` vs `한식`).
 * 그래서 종전 화면의 태그 줄은 바로 위 메타 줄이 이미 말한 단어를 한 번 더 적는
 * 줄이었다 — 정보가 0 인데 세로를 한 줄 먹고, 눈은 새 정보인 줄 알고 읽는다.
 *
 * 지우는 게 아니라 **중복만** 뺀다. 카테고리와 다른 태그가 오면 그대로 보인다.
 */
export function displayTags(
  tags: readonly string[],
  category: string,
): string[] {
  const normalizedCategory = category.trim().replace(/^#+/u, "").toLowerCase()
  return filterClinicalTags(tags).filter(
    (tag) =>
      tag.replace(/^#+/u, "").trim().toLowerCase() !== normalizedCategory,
  )
}

/**
 * 제목 아래 본문 자리에 `description` 을 둘 것인가.
 *
 * 서버(`sinsin-be-bun/src/domains/recipe/service.ts::descriptionForLocale`)는 **검수 전
 * 카탈로그**(`author.isCurated === true`)의 원문 설명을 일부러 내보내지 않는다 —
 * 그 문장이 임상 주장을 담고 있을 수 있고 175건은 아직 사람이 읽지 않았다. 대신
 * 고정 문장 하나를 준다. 실측: 175건 전부 `"재료와 조리 순서를 확인해 보세요."` 다.
 *
 * 그 문장을 제목 바로 아래 본문으로 그리면, 화면에서 **가장 값비싼 자리**에 레시피마다
 * 똑같은 안내문이 앉는다. 게다가 그 안내가 가리키는 재료·조리 순서 섹션이 바로 밑에
 * 있어서 스스로도 필요 없다. 문자열을 비교해서 지우지 않는다(서버 문구가 바뀌면 깨진다) —
 * **출처로 가른다.** 작성자가 직접 쓴 설명(`isCurated === false`)은 그대로 본문이다.
 */
export function showsDescription(author: { isCurated: boolean }): boolean {
  return !author.isCurated
}

/**
 * 저장 수를 적을 것인가. 0 은 적지 않는다.
 *
 * `저장 0` 은 "아무도 저장하지 않았다" 는 사실이지만, 카탈로그가 새것이라 실측 175건 중
 * 174건이 0 이다. 모든 화면에 같은 0 이 붙으면 그건 정보가 아니라 배경 무늬이고,
 * 새 레시피에 대고 "아무도 안 골랐다" 고 말하는 쪽에 가깝다.
 */
export function showsSaveCount(saveCount: number): boolean {
  return saveCount > 0
}

/**
 * 재료 한 줄이 **이 화면에서 실제로 다르게 동작하는가**. 다르지 않으면 아무 표시도 하지 않는다.
 *
 * ─── 왜 규칙을 새로 만들었나 (실측) ─────────────────────────────────────────
 * 종전에는 `matched === false` 인 모든 줄에 두 번째 줄을 깔았다. dev 카탈로그에서 그
 * 비율은 60~100% 였다(21번 4/10, 61번 4/4, 195번 15/20). 즉 거의 모든 줄에 회색 문장이
 * 하나씩 더 붙어 목록이 두 배로 길어지고, 정작 **어느 줄이 다른지**는 안 보였다.
 *
 * 더 나쁜 건 그 문장이 오늘 데이터에서 아무 결과도 없다는 것이다. 175/175 의
 * `provenance` 가 `reference_estimate` 이고, 그때 영양 수치는 재료를 더해서 만든 값이
 * **아니다.** 그래서 "식품표에서 못 찾았다" 는 사실은 화면의 어떤 숫자도 바꾸지 않는다.
 * 서버도 같은 말을 한다 — 21번은 `matched:false` 가 4건인데 `unmatchedIngredients` 는
 * 빈 배열이다(= 빠진 것이 없다). 화면만 "빠진 것 같은" 회색 문장을 4줄 그리고 있었다.
 *
 * ─── 규칙 ────────────────────────────────────────────────────────────────
 * 표시는 **결과가 있을 때만** 한다.
 *  - `not_counted`  — 재료로 계산한 수치인데(`computed_from_ingredients`) 이 재료가
 *                     빠졌다. 위의 숫자가 실제보다 작다는 뜻이라 반드시 보인다.
 *  - `not_scalable` — 그램을 모르는 분량(`소량`)이고 인분 조절이 열려 있다.
 *                     스테퍼를 눌러도 이 줄만 안 바뀐다 — 눈앞에서 벌어지는 일이다.
 *  - `none`         — 위 둘이 아니면 결과가 없다. 조용히 둔다.
 *
 * 정직을 지우는 게 아니라 **옮긴다.** 수치가 무엇인지는 섹션 한 줄
 * (`ingredientCoverage`)과 출처 시트가 말한다. 같은 문장을 열 줄에 복사하는 것보다
 * 한 번 정확히 말하는 쪽이 더 정직하다.
 */
export type IngredientUncertainty = "none" | "not_counted" | "not_scalable"

export function ingredientUncertainty(
  ingredient: Pick<RecipeIngredient, "matched" | "reason" | "grams">,
  options: {
    provenance: RecipeNutritionProvenance
    /** 인분 스테퍼가 화면에 있는가. 없으면 "안 바뀐다" 는 말이 가리킬 대상이 없다. */
    adjustable: boolean
  },
): IngredientUncertainty {
  if (
    options.provenance === "computed_from_ingredients" &&
    !ingredient.matched
  ) {
    // 수치에 영향을 주는 쪽이 먼저다. 이 줄은 인분에도 안 따라오지만(그램이 없으면),
    // 그건 섹션 legend 가 이미 말한다.
    return "not_counted"
  }
  if (ingredient.grams == null && options.adjustable) return "not_scalable"
  return "none"
}

/**
 * 영양 수치와 아래 재료 목록의 **관계**를 섹션에서 한 번 말한다.
 *
 * 사용자가 재료 목록을 보며 던지는 질문은 "위의 376mg 은 이 열 줄을 더한 값인가?" 다.
 * 종전 화면은 그 질문에 답한 적이 없다. 줄마다 붙은 회색 문장은 답처럼 보였지만
 * 답이 아니었다(위 `ingredientUncertainty` 머리말).
 *
 *  - `counted`            — 재료를 더해서 만든 값이다. 몇 개가 들어갔는지 세어 준다.
 *  - `wholeDishEstimate`  — 한 그릇 단위로 받은 값이다(추정값·작성자 입력·영양사 검수).
 *                           재료를 하나씩 더한 값이 아니라는 사실만 말한다. 어디서 왔는지는
 *                           출처 배지와 시트의 몫이다 — 여기서 두 번 말하지 않는다.
 */
export type IngredientCoverage =
  | { kind: "counted"; counted: number; total: number }
  | { kind: "wholeDishEstimate" }

export function ingredientCoverage(
  ingredients: readonly Pick<RecipeIngredient, "matched">[],
  provenance: RecipeNutritionProvenance,
): IngredientCoverage {
  if (provenance !== "computed_from_ingredients") {
    return { kind: "wholeDishEstimate" }
  }
  return {
    kind: "counted",
    counted: ingredients.filter((item) => item.matched).length,
    total: ingredients.length,
  }
}

/** 준비 체크 진행률 0~100. 재료가 0개면 0(막대를 그리지 않는 쪽은 화면이 정한다). */
export function preparedPercent(checked: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (checked / total) * 100))
}

/** 계약에 없는 provenance 는 받지 않는다. null 이면 화면이 수치를 그리지 않는다. */
export function resolveProvenance(
  value: unknown,
): RecipeNutritionProvenance | null {
  if (typeof value !== "string") return null
  return RECIPE_NUTRITION_PROVENANCES.find((known) => known === value) ?? null
}

/**
 * 계산에 못 들어간 재료에 무엇을 적을지 고른다. **세 가지 서로 다른 사실**이고,
 * 하나로 뭉치면 거짓이 된다.
 *
 *  - `unknown_amount` → "무게를 알 수 없는 분량이에요". 실측: `참기름 소량`·`달걀 1개`
 *    가 여기 해당하는데, 둘 다 식품표에 **있다**(`참기름` 은 그 이름 그대로, `달걀` 은
 *    `달걀, 생것`). 여기서 "식품표에 없다" 고 말하면 거짓이고, 사용자는 이름을 바꿔
 *    적으며 헛수고한다.
 *  - `not_in_catalog` + 재료로 계산한 수치 → "계산에서 빠졌다". 수치가 그만큼 낮다.
 *  - `not_in_catalog` + 다른 출처 → 빠진 것이 없다(통째로 다른 출처다). 사실만 말한다.
 *
 * **이 화면은 지시하지 않는다.** "150g 처럼 적어 주세요" 같은 문장은 큐레이션 레시피를
 * 읽는 사람이 할 수 없는 일이다. 그 지시는 사용자가 실제로 고칠 수 있는 작성 화면
 * (`recipeWrite.nutrition.unmatched*`)에 있다.
 */
export function unmatchedCopyKey(
  reason: IngredientMatchReason,
  computedFromIngredients: boolean,
):
  | "detail.ingredients.unknownAmount"
  | "detail.ingredients.excluded"
  | "detail.ingredients.notInFoodTable" {
  if (reason === "unknown_amount") return "detail.ingredients.unknownAmount"
  return computedFromIngredients
    ? "detail.ingredients.excluded"
    : "detail.ingredients.notInFoodTable"
}

/* ── 차단한 사용자의 리뷰 ────────────────────────────────────────────── */

/**
 * 차단한 사용자의 리뷰를 목록에서 뺀다.
 *
 * ## 왜 필요했나 (같은 앱 안에서 갈라져 있던 규칙)
 *
 * 이 앱의 다른 UGC 는 전부 신고·차단 경로를 갖고 있다 — 커뮤니티 글·댓글은
 * `POST /community/posts/{id}/report` 와 `blockService`, 식당 후기는
 * `POST /restaurants/reviews/{id}/report`(+ `ReviewReportSheet`). **레시피 리뷰만
 * 아무 경로도 없었다.** 남이 쓴 글이 내 화면에 뜨는데 치울 방법이 없는 화면이 하나
 * 남아 있었던 셈이고, 이는 스토어 심사 기준(사용자 생성 콘텐츠에는 신고·차단 수단이
 * 있어야 한다)에도 걸린다.
 *
 * 서버에 레시피 리뷰 신고 테이블이 아직 없으므로(도메인마다 별 표를 쓰는 구조다)
 * **이미 있는 차단**을 먼저 붙인다. 차단은 닉네임 기준이고(`blockService`), 리뷰
 * 응답에 `authorNickName` 이 있어 서버 변경 없이 오늘 동작한다.
 *
 * ## 규칙
 *
 *  - **내 리뷰는 절대 숨기지 않는다.** 닉네임이 우연히 차단 목록에 있어도(자기 자신을
 *    차단하는 경로는 없지만, 닉네임은 바뀔 수 있다) 내가 쓴 글이 내 화면에서 사라지면
 *    그건 데이터가 사라진 것으로 읽힌다.
 *  - 비교는 **트림 + 대소문자 무시**다. 닉네임 표기가 한 글자 다르다고 차단이 풀리면
 *    사용자는 차단이 안 먹는다고 느낀다.
 *  - 별점 요약(평균·개수)은 그대로 둔다 — 그건 서버가 전체로 계산한 값이고, 한 명을
 *    가렸다고 평균을 앱에서 다시 계산하면 화면마다 다른 별점이 뜬다.
 */
export function visibleReviews<
  T extends { authorNickName: string; mine: boolean },
>(reviews: readonly T[], blockedNickNames: readonly string[]): T[] {
  if (blockedNickNames.length === 0) return [...reviews]
  const blocked = new Set(
    blockedNickNames.map((name) => name.trim().toLowerCase()),
  )
  return reviews.filter(
    (review) =>
      review.mine || !blocked.has(review.authorNickName.trim().toLowerCase()),
  )
}

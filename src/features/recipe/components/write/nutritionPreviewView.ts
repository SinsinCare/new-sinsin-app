/**
 * 영양 미리보기의 **표시 계산**. 순수 함수만 둔다(테스트가 붙어 있다).
 *
 * 여기서 수치를 만들지 않는다 — 서버가 준 값을 고르고 자르는 일만 한다.
 * 계산을 앱으로 옮기면 앱 버전마다 같은 레시피의 나트륨이 갈린다(계약 §4.1).
 */

import type {
  NutrientHeadline,
  PerIngredientNutrition,
  RecipeNutrition,
} from "@/src/features/recipe/types/recipeWrite"

/**
 * 카드에 한 줄로 쓸 영양소 하나. **남은 양을 가장 많이 먹는 것**을 고른다
 * (계약 §3.1 `headline`: "이 레시피에서 가장 빡빡한 영양소 하나").
 *
 * 비율을 아는 것이 하나도 없으면(한도를 못 만들었을 때) 나트륨을 쓴다 — CKD 에서
 * 가장 먼저 보는 값이고, 비율 없이 절대값만 말하게 된다.
 */
export function pickHeadlineNutrient(
  breakdown: readonly NutrientHeadline[],
): NutrientHeadline | null {
  if (breakdown.length === 0) return null
  const withPercent = breakdown.filter(
    (item) => item.percentOfRemaining !== null,
  )
  if (withPercent.length === 0) {
    return (
      breakdown.find((item) => item.key === "sodium") ?? breakdown[0] ?? null
    )
  }
  return withPercent.reduce((best, item) =>
    (item.percentOfRemaining ?? 0) > (best.percentOfRemaining ?? 0)
      ? item
      : best,
  )
}

/**
 * `480mg` · `7g` · `0.5g`. 소수 첫째 자리까지 쓰고 `.0` 은 지운다.
 *
 * 지어낸 정밀도를 붙이지 않는다 — 재료 표기가 `1큰술` 인 계산에 `479.83mg` 을 적으면
 * 측정한 값처럼 보인다.
 */
export function formatNutrientAmount(headline: NutrientHeadline): string {
  const rounded = Math.round(headline.amount * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}${headline.unit}`
}

/** 막대 길이(0~1). 100% 를 넘으면 꽉 찬 채로 두고 넘친 사실은 숫자가 말한다. */
export function barRatio(percentOfRemaining: number | null): number {
  if (percentOfRemaining === null) return 0
  if (percentOfRemaining <= 0) return 0
  return Math.min(1, percentOfRemaining / 100)
}

/**
 * 계산에서 빠진 재료. 중복을 지우고 순서를 유지한다 — 같은 이름을 두 줄에 적으면
 * 서버가 두 번 올려 보내는데, 화면에 두 번 뜨면 "왜 두 개지" 를 먼저 묻게 된다.
 */
export function unmatchedNames(
  nutrition: Pick<RecipeNutrition, "unmatchedIngredients">,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of nutrition.unmatchedIngredients) {
    const trimmed = name.trim()
    if (trimmed === "" || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

/** 빠진 재료를 **이유별로** 나눈다. */
export interface UnmatchedGroups {
  /** 무게를 몰라 빠졌다. `"150g"` 처럼 적으면 계산에 들어간다 — 고칠 수 있다. */
  readonly unknownAmount: string[]
  /** 무게는 알지만 그 이름을 식품 성분표에서 못 찾았다. 다른 이름으로 적어야 한다. */
  readonly notInCatalog: string[]
}

/**
 * `perIngredient[].reason` 으로 나눈다. **`unmatchedIngredients`(이름만) 로는 나눌 수
 * 없다** — 그래서 이 화면이 모든 미매칭 재료에 "무게를 몰라 빠졌어요" 를 붙였고,
 * `흰쌀밥 210g`(무게를 아는데 이름을 못 찾은 경우)에도 그렇게 말했다.
 *
 * 이름은 중복을 지우고 순서를 유지한다(위 `unmatchedNames` 와 같은 이유).
 */
export function groupUnmatched(
  rows: readonly Pick<PerIngredientNutrition, "name" | "matched" | "reason">[],
): UnmatchedGroups {
  const seen = new Set<string>()
  const unknownAmount: string[] = []
  const notInCatalog: string[] = []
  for (const row of rows) {
    if (row.matched) continue
    const name = row.name.trim()
    if (name === "" || seen.has(name)) continue
    seen.add(name)
    if (row.reason === "unknown_amount") unknownAmount.push(name)
    else notInCatalog.push(name)
  }
  return { unknownAmount, notInCatalog }
}

/**
 * 수치를 그려도 되는가. **`provenance` 가 없으면 그리지 않는다**(계약 §1.1).
 * 서버가 필드를 빠뜨렸을 때 화면이 조용히 "검수된 값" 처럼 보이는 것을 막는다.
 */
export function canRenderNutrition(
  nutrition: RecipeNutrition | undefined,
): nutrition is RecipeNutrition {
  return (
    nutrition !== undefined &&
    typeof nutrition.provenance === "string" &&
    nutrition.provenance.length > 0
  )
}

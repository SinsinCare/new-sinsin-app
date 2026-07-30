/**
 * 카드에 그릴 값을 정하는 순수 함수들. 계약 §6.3 카드가 이 함수들의 결과만 그린다.
 *
 * 왜 컴포넌트 밖으로 뺐나: 시안 카드의 결함 세 개가 전부 "무엇을 그릴지" 의 판단
 * 문제였다 — (a) `★4.0 (27)` 이 데이터 없이 그려져 있었고, (b) 태그가 `#저염ㅅ` 로
 * 잘렸고, (c) 임상 태그가 카드마다 붙어 있었다. 판단을 JSX 안에 두면 테스트할 수
 * 없어서 다음 리팩터에서 조용히 되살아난다. 여기서 정하고 jest 로 못 박는다.
 *
 * i18n 은 하지 않는다 — 문자열은 화면이 `t()` 로 만든다(계약 §6.4).
 */
import type {
  NutrientHeadline,
  RatingSummary,
  RecipeCard,
} from "../../types/recipeListV2"

/** 1227 → "1,227". Intl 없이 결정론적으로 — 테스트가 로케일에 흔들리지 않게. */
export function groupThousands(value: number): string {
  const rounded = Math.round(Math.abs(value))
  const sign = value < 0 ? "-" : ""
  const digits = String(rounded)
  let out = ""
  for (let index = 0; index < digits.length; index += 1) {
    const fromEnd = digits.length - index
    out += digits[index]
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ","
  }
  return sign + out
}

/**
 * 영양 수치 표기. mg 는 정수, g 는 소수 첫째 자리(정수면 소수점을 안 붙인다).
 * 신장 환자가 읽는 숫자라 반올림 규칙을 화면마다 다르게 두지 않는다.
 */
export function formatNutrientAmount(amount: number, unit: "mg" | "g"): string {
  if (unit === "mg") return `${groupThousands(amount)}mg`
  const rounded = Math.round(amount * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}g`
}

/**
 * 계약 §1.1 의 관문 — **provenance 없이 수치를 그리지 않는다.**
 * `nutrition` 이 null(= provenance 를 신뢰할 수 없음)이면 headline 이 와도 버린다.
 */
export function resolveCardHeadline(card: RecipeCard): NutrientHeadline | null {
  if (!card.nutrition) return null
  if (!card.headline) return null
  return card.headline
}

/**
 * 계약 §6.1: 리뷰 0건이면 별점 영역을 **안 그린다**(0.0 을 만들지 않는다).
 * 평균이 null 인데 개수가 있는 경우도 그리지 않는다 — 별 없이 개수만 있는 줄은
 * 사용자가 무엇의 개수인지 알 수 없다.
 */
export function resolveCardRating(
  rating: RatingSummary,
): { average: string; count: number } | null {
  if (rating.count <= 0 || rating.average == null) return null
  return { average: rating.average.toFixed(1), count: rating.count }
}

/**
 * 계약 §1.2 의 차단 토큰. 서버 `mealrec/tables.generated.ts::BLOCKED_TAG_TOKENS` 와
 * 같은 목록에 계약이 든 `고열량`/`high calorie` 를 더했다(서버 목록에 그 둘이 없다).
 *
 * 왜 앱에도 두는가: 계약 §3.1 은 `tags` 가 "§1.2 로 걸러진 것만" 온다고 적었고 그건
 * 서버의 책임이다. 그런데 서버가 한 번 빠뜨리면 **검수 전 카탈로그 카드에 `#저염` 이
 * 찍힌다** — 그 자체가 §1.2 가 금지한 임상 주장이고, 앱은 그걸 그대로 그린다.
 * provenance 는 §1.1 을 앱에서 한 번 더 막는데(normalizeNutrition) 태그는 막는 곳이
 * 없었다. 여기서 막는다. 서버가 제대로 걸러 주면 이 필터는 아무것도 하지 않는다.
 */
export const CLINICAL_TAG_TOKENS: readonly string[] = [
  "저염",
  "저단백",
  "저칼륨",
  "저인",
  "고열량",
  "ckd",
  "투석",
  "당뇨",
  "고혈압",
  "신장",
  "콩팥",
  "low sodium",
  "low protein",
  "low potassium",
  "low phosphorus",
  "high calorie",
  "dialysis",
  "diabetes",
  "hypertension",
  "kidney",
  "renal",
]

/** 토큰이 하나라도 들어간 태그는 통째로 버린다(서버 `nonclinicalTags` 와 같은 규칙). */
export function isClinicalTag(tag: string): boolean {
  const lowered = tag.toLowerCase()
  return CLINICAL_TAG_TOKENS.some((token) => lowered.includes(token))
}

/**
 * 카드에 그릴 태그. 계약 §6.1: **최대 2개 + 넘치면 `+N`. 잘리지 않는다.**
 * 글자 예산으로 자르는 이유: 개수만 제한하면 긴 태그 두 개가 카드 폭을 넘겨
 * 시안과 똑같이 `#저염ㅅ` 가 된다. 렌더 폭을 재지 않고도 깨지지 않는 유일한 방법이
 * "몇 글자까지" 를 미리 정하는 것이다.
 *
 * 임상 태그는 **`overflow` 에도 세지 않는다.** `+1` 은 "자리가 없어 못 보여준 게 있다" 는
 * 뜻이라 사용자가 카드를 눌러 찾게 만드는데, 임상 태그는 어디서도 보여주지 않는다.
 */
export const CARD_TAG_MAX_COUNT = 2
export const CARD_TAG_CHAR_BUDGET = 14

export function resolveCardTags(
  tags: readonly string[],
  options?: { maxCount?: number; charBudget?: number },
): { shown: string[]; overflow: number } {
  const maxCount = options?.maxCount ?? CARD_TAG_MAX_COUNT
  const charBudget = options?.charBudget ?? CARD_TAG_CHAR_BUDGET

  const cleaned = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    // 계약 §1.2 — 임상 토큰이 든 태그는 화면에 없다.
    .filter((tag) => !isClinicalTag(tag))
    // 같은 태그가 두 번 오면 한 번만 — 시안 카드에 `#저염식 #저염ㅅ` 이 실제로 있었다.
    .filter((tag, index, all) => all.indexOf(tag) === index)

  const shown: string[] = []
  let used = 0
  for (const tag of cleaned) {
    if (shown.length >= maxCount) break
    if (used + tag.length > charBudget) break
    shown.push(tag)
    used += tag.length
  }
  return { shown, overflow: cleaned.length - shown.length }
}

/** 카드 맨 아래 줄(35분 · 1인분). 값이 없는 항목은 아예 빼서 "0분" 을 만들지 않는다. */
export function resolveCardMeta(card: RecipeCard): {
  timeMin: number | null
  servings: number | null
} {
  const timeMin =
    card.timeMin != null && card.timeMin > 0 ? Math.round(card.timeMin) : null
  const servings =
    card.servings != null && card.servings > 0
      ? Math.round(card.servings)
      : null
  return { timeMin, servings }
}

/**
 * 목록 어디에든 추정치가 섞여 있는가. 카드마다 배지를 붙이면 §6.4(한 화면에 강조 하나)
 * 가 깨지므로, 목록 상단에 한 줄로 한 번만 알린다.
 */
export function hasEstimatedNutrition(cards: readonly RecipeCard[]): boolean {
  return cards.some(
    (card) =>
      card.nutrition != null &&
      card.nutrition.provenance !== "nutritionist_reviewed",
  )
}

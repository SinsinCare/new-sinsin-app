/**
 * 레시피 홈(오늘의 아침·점심·저녁) 계약 타입 — 계약 §2 `GET /api/v1/recipes/home`.
 *
 * `RecipeCard` 는 **다시 정의하지 않는다.** 계약이 "RecipeCard 는 바꾸지 않는다" 고 못
 * 박았고, 목록 쪽 타입(`types/recipeListV2.ts`)이 이미 그 모양이다. 홈이 카드 타입을
 * 자기 것으로 한 벌 더 두면 목록·홈의 카드가 조용히 갈라진다 — 서버 보고에 이미 같은
 * 사고(`engagement.ts` 의 두 번째 `buildRecipeCards`)가 적혀 있다.
 *
 * 슬롯 문자열은 서버가 쓰는 값 그대로다(`'BREAKFAST'|'LUNCH'|'DINNER'`).
 */
import type { NutrientBudget, RecipeCard } from "./recipeListV2"

/**
 * 하루의 순서. 섹션 **회전**의 기준이라 순서가 의미를 갖는다(계약 §2:
 * "순서는 currentSlot 이 첫 번째").
 */
export const MEAL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER"] as const

export type MealSlot = (typeof MEAL_SLOTS)[number]

export function isMealSlot(value: unknown): value is MealSlot {
  return (
    typeof value === "string" &&
    (MEAL_SLOTS as readonly string[]).includes(value)
  )
}

/**
 * i18n 키 조각. `recipe:home.section.{breakfast|lunch|dinner}.title` 로 조립한다.
 * 서버 값(대문자)을 화면에서 매번 `toLowerCase()` 하지 않는 이유: 키를 문자열 연산으로
 * 만들면 슬롯이 하나 늘 때 어떤 키가 없는지 타입이 말해 주지 않는다.
 */
export const MEAL_SLOT_I18N = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
} as const satisfies Record<MealSlot, string>

/** 계약 §2: `items` 최대 10개. 앱도 같은 상한을 걸어 둔다(서버가 더 주면 잘라 낸다). */
export const RECIPE_HOME_SECTION_LIMIT = 10

/**
 * 이 끼니의 **오늘 상태**. 서버가 `food_diary` · `skipped_meal` 을 보고 붙인다.
 *
 * `RECORDED` 와 `SKIPPED` 를 하나로 합치지 않는 이유는 화면이 말하는 문장이 다르기
 * 때문이다("아침을 기록했어요" vs "아침을 건너뛰었어요"). 순서 결정에서는 둘 다 같게
 * 다뤄지지만(끝난 끼니는 뒤로 간다) 사용자에게는 다른 사실이다.
 */
export const MEAL_SLOT_STATES = ["OPEN", "RECORDED", "SKIPPED"] as const

export type MealSlotState = (typeof MEAL_SLOT_STATES)[number]

export function isMealSlotState(value: unknown): value is MealSlotState {
  return (
    typeof value === "string" &&
    (MEAL_SLOT_STATES as readonly string[]).includes(value)
  )
}

/**
 * `currentSlot` 이 **왜** 그것인가. 서버가 시계만 보지 않기 때문에 필요한 값이다.
 *
 *  - `CLOCK`        시계가 가리킨 그대로.
 *  - `AFTER_RECORD` 그 끼니를 이미 기록해서 다음 끼니로 넘어갔다.
 *  - `AFTER_SKIP`   그 끼니를 건너뛴다고 표시해서 넘어갔다.
 *  - `NEXT_DAY`     오늘 남은 끼니가 없다 — 내일 아침이다.
 *
 * 화면이 이 값을 **반드시 문장으로 그린다**. 순서가 시계와 다르게 나오는데 이유를
 * 말하지 않으면 사용자는 화면이 고장 났다고 읽는다.
 */
export const SLOT_REASONS = [
  "CLOCK",
  "AFTER_RECORD",
  "AFTER_SKIP",
  "NEXT_DAY",
] as const

export type SlotReason = (typeof SLOT_REASONS)[number]

export function isSlotReason(value: unknown): value is SlotReason {
  return (
    typeof value === "string" &&
    (SLOT_REASONS as readonly string[]).includes(value)
  )
}

export interface SlotDecision {
  slot: MealSlot
  reason: SlotReason
  /** 시계만 봤을 때의 슬롯. 전진이 실제로 일어났는지 응답만 보고 알 수 있다. */
  clockSlot: MealSlot
  /** `slot` 이 **내일**의 끼니인가. 제목이 "오늘의" 를 쓸지 가른다. */
  isNextDay: boolean
  /** 시간대 경계가 내 기록에서 나왔는가(`PERSONAL`), 기본값인가(`DEFAULT`). */
  clockSource: "PERSONAL" | "DEFAULT"
}

export interface RecipeHomeSection {
  slot: MealSlot
  /** 오늘 이 끼니를 기록했는가·건너뛰었는가. 섹션을 **감추는 근거가 아니다.** */
  state: MealSlotState
  /** **빈 배열일 수 있다.** 그때도 섹션은 사라지지 않는다(계약 §2). */
  items: RecipeCard[]
}

export interface RecipeHomeResponse {
  /** 이 세 섹션을 만들 때 쓴 남은 참고량. 목록 API 의 `budget` 과 같은 모양이다. */
  budget: NutrientBudget
  /** 서버 시계(KST) + 오늘의 기록 기준. **앱이 정하지 않는다.** */
  currentSlot: MealSlot
  /** `currentSlot` 의 근거. 화면이 한 줄로 설명하는 데 쓴다. */
  slotDecision: SlotDecision
  /** 항상 3개. 순서는 서버가 정한 그대로 쓴다. */
  sections: RecipeHomeSection[]
}

/**
 * `currentSlot` 을 첫 번째로 두고 하루의 순서를 회전시킨다.
 *
 * **앱은 이것으로 서버 응답을 다시 정렬하지 않는다.** 쓰이는 곳은 두 군데뿐이다:
 *  1) 서버가 섹션을 빠뜨렸을 때 빠진 슬롯을 어디에 끼울지(정규화의 마지막 방어),
 *  2) 모의 서버가 서버 몫을 대신할 때.
 * 화면은 `sections` 배열 순서만 읽는다(계약 §2 / 지시 1).
 */
export function orderFromCurrentSlot(currentSlot: MealSlot): MealSlot[] {
  const start = MEAL_SLOTS.indexOf(currentSlot)
  if (start < 0) return [...MEAL_SLOTS]
  return MEAL_SLOTS.map(
    (_, index) => MEAL_SLOTS[(start + index) % MEAL_SLOTS.length],
  )
}

/**
 * react-query 캐시에 들어가는 모양. **`sections` 가 아니라 `pages` 다.**
 *
 * 왜 이름이 `pages` 인가 — 저장 상태 전파 때문이다. `useRecipeDetailV2.ts` 의
 * `patchLists` 가 상세에서 저장한 절대값을 `["recipes-v2"]` 루트의 모든 캐시에
 * `patchSavedStateInPages(old.pages, …)` 로 얹는다. 그 함수는 `page.items` 만 만지고
 * 나머지 필드는 스프레드로 보존하므로(`recipeArchiveService.ts` L116~139 실측),
 * **섹션 배열을 `pages` 로 두면 홈 섹션의 카드도 같은 한 곳에서 함께 갱신된다.**
 *
 * 대안은 `useRecipeDetailV2.ts` 에 홈 루트를 더하는 것이지만 그 파일은 이 갈래의
 * 소유가 아니다. 그래서 **캐시 모양을 기존 순회에 맞췄다** — 효과는 같고 고치는 파일은
 * 내 것뿐이다. 되돌리려면 이 주석을 먼저 볼 것.
 *
 * `pages` 라는 이름이 새어 나가지 않게, 훅은 이것을 `sections` 로 바꿔 내보낸다.
 */
export interface RecipeHomeCache {
  budget: NutrientBudget
  currentSlot: MealSlot
  slotDecision: SlotDecision
  /** = `RecipeHomeResponse.sections`. 이름만 `patchLists` 순회에 맞춘 것이다. */
  pages: RecipeHomeSection[]
}

export function toRecipeHomeCache(
  response: RecipeHomeResponse,
): RecipeHomeCache {
  return {
    budget: response.budget,
    currentSlot: response.currentSlot,
    slotDecision: response.slotDecision,
    pages: response.sections,
  }
}

/**
 * 레시피 v2 목록·검색 계약 타입 (docs/contract/recipe-v2.md §3.1 / §3.2).
 *
 * 왜 별 파일인가: 서버가 아직 없어도 화면을 만들 수 있어야 한다. 계약의 모양을
 * 그대로 타입으로 박아 두면 서버가 붙을 때 매핑만 확인하면 되고, 그 전에는 모의
 * payload 가 같은 타입을 지나므로 화면이 진짜와 같은 경로를 탄다.
 *
 * 계약과 **의도적으로 다른 한 곳**: `RecipeCard.nutrition` 이 nullable 이다.
 * 계약 §1.1 은 "앱은 provenance 없이 수치를 그리지 않는다" 고 못 박았다. 서버가
 * provenance 를 빠뜨리거나 모르는 값을 보내면 그 카드의 nutrition 을 아예 null 로
 * 만들어 **그릴 수 없게** 한다. 옵셔널 체이닝으로 넘어가면 언젠가 누군가
 * `?? 0` 을 붙이고, 그 순간 검수 전 추정치가 확정 수치로 화면에 뜬다.
 */

/** 계약 §3.1. quick = 조리시간 짧은 순. */
export type RecipeSortKey =
  | "recommended"
  | "recent"
  | "rating"
  | "saves"
  | "quick"

export const RECIPE_SORT_KEYS: readonly RecipeSortKey[] = [
  "recommended",
  "recent",
  "rating",
  "saves",
  "quick",
]

/** 계약 §3.2. 이 넷 말고는 수치를 그리지 않는다. */
export type NutritionProvenance =
  | "reference_estimate"
  | "computed_from_ingredients"
  | "author_supplied"
  | "nutritionist_reviewed"

export const NUTRITION_PROVENANCES: readonly NutritionProvenance[] = [
  "reference_estimate",
  "computed_from_ingredients",
  "author_supplied",
  "nutritionist_reviewed",
]

export type NutrientKey = "sodium" | "potassium" | "phosphorus" | "protein"

export interface RecipeNutrition {
  kcal: number
  proteinG: number
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  provenance: NutritionProvenance
  /** 식품표에서 못 찾은 재료. 있으면 "일부 재료는 계산에서 빠졌어요". */
  unmatchedIngredients: string[]
}

export interface NutrientHeadline {
  key: NutrientKey
  amount: number
  unit: "mg" | "g"
  /** 내 남은 참고량 대비 0~999. 남은 양이 0 이하거나 계산 불가면 null. */
  percentOfRemaining: number | null
}

export interface NutrientBudget {
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  /** 체중 기록이 없으면 null. */
  proteinG: number | null
}

export interface RatingSummary {
  /** 리뷰가 없으면 null — 0.0 을 만들지 않는다(계약 §3.4). */
  average: number | null
  count: number
  /** [1점, 2점, 3점, 4점, 5점] */
  distribution: [number, number, number, number, number]
}

export interface RecipeCard {
  id: number
  name: string
  /** 없으면 null. 앱이 자리채우기 문구를 만들지 않는다. */
  summary: string | null
  category: string
  difficulty: string | null
  timeMin: number | null
  servings: number | null
  thumbnailUrl: string | null
  /** 계약 §1.2 로 걸러진 것만 온다. 앱은 화면 폭 때문에 여기서 또 줄인다(2개 + +N). */
  tags: string[]
  /** provenance 를 신뢰할 수 없으면 null — 그러면 카드에 수치를 안 그린다. */
  nutrition: RecipeNutrition | null
  /** 이 레시피에서 가장 빡빡한 영양소 하나. */
  headline: NutrientHeadline | null
  rating: RatingSummary
  saveCount: number
  saved: boolean
  authored: boolean
}

export interface RecipeListResponse {
  items: RecipeCard[]
  nextCursor: string | null
  hasMore: boolean
  budget: NutrientBudget
  /**
   * 계약에 없는 필드다(§3.1 에 없음). 그런데 §6.1 이 "결과 수를 먼저 보여준다(32개)"
   * 를 요구한다 — 키셋 페이지네이션만으로는 전체 개수를 알 수 없다. 서버가 안 주면
   * null 이고, 그때 앱은 "20개 이상" 처럼 **불려 말하지 않는** 문구로 내려간다.
   */
  totalCount: number | null
}

export interface RecipeListQuery {
  limit?: number
  cursor?: string
  q?: string
  /** 서버에 보내는 값은 저장된 표기(예: "한식"). 계약 §3.1 예시 그대로. */
  categories?: readonly string[]
  tags?: readonly string[]
  sort?: RecipeSortKey
}

/**
 * `GET /recipes/search/suggest` 응답. **계약 §3 에 타입이 없다** — 엔드포인트만
 * 표에 있다. 아래는 앱이 가정한 최소 모양이고, 서버가 문자열 배열만 주더라도
 * 정규화가 흡수한다(recipeListV2Service.normalizeSuggestions).
 */
export interface RecipeSuggestion {
  /** 화면에 그리고, 그대로 검색어로 확정되는 문자열. */
  text: string
  /** 특정 레시피를 가리키면 그 id. 단순 검색어 제안이면 null. */
  recipeId: number | null
  kind: "recipe" | "keyword"
}

export interface RecipeSuggestResponse {
  items: RecipeSuggestion[]
}

/**
 * 레시피 v2 응답 타입 — `sinsin-be-bun/docs/contract/recipe-v2.md` §3 을 그대로 옮긴 것이다.
 *
 * 왜 v1 타입(`data/curatedRecipeTypes.ts`)을 쓰지 않는가:
 *   v1 은 `ckd_guide`·`ai_summary`·`ckd_friendliness` 를 필드로 갖는다. 계약 §1.1 은 그 세
 *   필드를 **삭제**하라고 못 박았다(검수 전 카탈로그가 임상 지시를 내보내는 경로였다).
 *   타입에 남겨 두면 언젠가 채우고 싶어지므로 새 파일에서 아예 없앤다.
 *
 * 이 파일에서 지키는 두 가지:
 *   1. `RecipeNutrition.provenance` 는 **필수**다(§3.2). 화면은 이 값 없이 수치를 그리지 않는다.
 *      서버가 빠뜨렸거나 계약에 없는 값을 보내면 `RecipeDetailView.nutrition` 이 null 이 되고
 *      영양 카드는 "표시할 수 없어요" 상태를 그린다 — 0 이나 임의값으로 채우지 않는다.
 *   2. 계약에 없는 앱 전용 필드는 `*View` 타입에만 둔다. 와이어 타입은 계약과 1:1 로 유지한다.
 */

// ---------------------------------------------------------------------------
// §3.2 영양
// ---------------------------------------------------------------------------

/** 계약 §3.2. 이 넷이 전부이고, 앱은 이 값 없이 수치를 그리지 않는다. */
export const RECIPE_NUTRITION_PROVENANCES = [
  "reference_estimate",
  "computed_from_ingredients",
  "author_supplied",
  "nutritionist_reviewed",
] as const

export type RecipeNutritionProvenance =
  (typeof RECIPE_NUTRITION_PROVENANCES)[number]

export interface RecipeNutrition {
  kcal: number
  proteinG: number
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  provenance: RecipeNutritionProvenance
  /** 계산에 쓰인 재료 중 식품표에서 못 찾은 것. 있으면 "일부 재료는 계산에서 빠졌어요". */
  unmatchedIngredients: string[]
}

/** 계약 §3.2. 4개 영양소 키. 화면 순서도 이 순서다(나트륨이 CKD 에서 가장 빡빡하다). */
export const NUTRIENT_KEYS = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

export interface NutrientHeadline {
  key: NutrientKey
  /** 이 레시피의 값 (mg 또는 g) */
  amount: number
  unit: "mg" | "g"
  /**
   * 내 남은 참고량 대비 비율(0~999). 남은 양이 0 이하이거나 한도를 계산할 수 없으면 null.
   * null 이면 앱은 비율을 숨기고 절대값만 보여준다.
   */
  percentOfRemaining: number | null
}

export interface NutrientBudget {
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  /** 체중 기록이 없으면 null. 앱은 이 항목만 "체중을 기록하면 계산할 수 있어요" 로 바꾼다. */
  proteinG: number | null
}

// ---------------------------------------------------------------------------
// §3.4 별점 · 리뷰
// ---------------------------------------------------------------------------

export interface RatingSummary {
  /** 소수 첫째 자리까지. 리뷰가 없으면 null — 0.0 으로 만들지 않는다. */
  average: number | null
  count: number
  /** 별점별 개수. [1점, 2점, 3점, 4점, 5점] */
  distribution: [number, number, number, number, number]
}

export interface MyReview {
  rating: number
  body: string | null
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: number
  /**
   * 글쓴이의 **사람 id**. 차단 판정의 신원 축이다(서버 alembic 088).
   *
   * `null` 은 "글쓴이가 누구인지 서버도 모른다" 이고, 그때 `authorNickName` 도 `""` 다 —
   * 서버가 같은 조인에서 둘을 함께 비운다. 이 필드를 내보내기 전 서버는 값 자체가 없어
   * `undefined` 로 온다. 둘 다 "모른다" 라서 판정은 `isAuthorBlocked` 한 곳에서 `!= null`
   * 로 본다: **모르면 안 접는다.**
   */
  authorId: number | null
  authorNickName: string
  rating: number
  body: string | null
  createdAt: string
  /** 내가 쓴 리뷰인가. 앱이 수정·삭제 버튼을 띄운다. */
  mine: boolean
}

export type ReviewSort = "recent" | "helpful"

export interface ReviewListResponse {
  items: Review[]
  nextCursor: string | null
  hasMore: boolean
  summary: RatingSummary
}

export interface UpsertMyReviewRequest {
  rating: number
  body?: string | null
}

export interface UpsertMyReviewResponse {
  review: MyReview
  summary: RatingSummary
}

export interface DeleteMyReviewResponse {
  summary: RatingSummary
}

/** 계약 §3.4: 본문 상한 2,000자. 화면의 카운터도 이 값을 쓴다. */
export const REVIEW_BODY_MAX_LENGTH = 2000

// ---------------------------------------------------------------------------
// §3.3 상세
// ---------------------------------------------------------------------------

/**
 * 재료가 영양 계산에 들어갔는가, 아니면 왜 못 들어갔는가 (서버 계약).
 *
 *  - `matched`         — 식품표에서 찾아 계산에 들어갔다
 *  - `unknown_amount`  — 분량(`소량`·`1개`)에서 그램을 정할 수 없어 **매칭을 시도하지
 *                        않았다.** 식품표에 있는지 없는지는 알 수 없다
 *  - `not_in_catalog`  — 그램은 알지만 그 이름을 식품표에서 찾지 못했다
 */
export type IngredientMatchReason =
  | "matched"
  | "unknown_amount"
  | "not_in_catalog"

export interface RecipeIngredient {
  ordinal: number
  name: string
  /** 원문 표기 그대로("70g", "소량", "1큰술"). 앱은 이걸 보여준다. */
  amountText: string
  /** 인분 조절에 쓸 수 있는 수치. 파싱 못 했으면 null(그때 앱은 조절 UI 를 숨긴다). */
  grams: number | null
  /** 이 재료가 식품표에서 매칭됐는가. false 면 영양 계산에서 빠졌다. */
  matched: boolean
  /**
   * `matched: false` 인 **이유**. `matched` 하나로는 화면이 거짓을 말한다 —
   * `참기름 소량` 은 식품표에 있는데도 매칭되지 않는다(분량을 모른다). 무엇을 적을지는
   * `IngredientSection` 의 `unmatchedCopyKey` 가 이 값으로 고른다.
   */
  reason: IngredientMatchReason
}

export interface RecipeStep {
  ordinal: number
  text: string
  imageUrl: string | null
  /** 본문에서 뽑아낸 시간(초). "중불 2~3분" → 180. 없으면 null. */
  timerSeconds: number | null
}

export type ContentLocale = "ko" | "en"

export interface RecipeLocaleInfo {
  requested: ContentLocale
  contentLocale: ContentLocale
  /** 재료·순서가 요청 로케일로 완전히 준비됐는가. 반쪽 번역은 false 이고 원문을 준다. */
  fullyTranslated: boolean
}

export interface RecipeAuthor {
  nickName: string
  isCurated: boolean
}

/** 계약 §3.3 와 1:1. 와이어 모양이며 화면은 아래 `RecipeDetailView` 를 쓴다. */
export interface RecipeDetail {
  portionReference?: import("@/src/features/nutrition/utils/portionReference").PortionReference | null;
  id: number
  name: string
  summary: string | null
  description: string | null
  category: string
  difficulty: string | null
  timeMin: number | null
  /** 원본 기준 인분 */
  servings: number | null
  heroImageUrl: string | null
  /**
   * 저장된 원본 경로(`uploads/…`). 수정 화면이 사진을 되돌려 보낼 때 쓴다 —
   * `heroImageUrl` 은 서명 URL 이라 경로로 못 쓴다.
   */
  heroImageObjectPath: string | null
  /**
   * 걸러지지 않은 태그. **작성자 본인일 때만** 오고 남에게는 `null` 이다.
   * `tags` 는 임상 토큰이 빠진 결과라 그쪽으로 폼을 채우면 수정할 때마다 태그가 날아간다.
   */
  authoredTags: string[] | null
  tags: string[]
  /** servings 1인분 기준 */
  nutrition: RecipeNutrition
  budget: NutrientBudget
  /** 4개 영양소 전부의 내 참고량 대비. 상세는 카드와 달리 전부 보여준다. */
  nutrientBreakdown: NutrientHeadline[]
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  rating: RatingSummary
  myReview: MyReview | null
  saveCount: number
  saved: boolean
  authored: boolean
  author: RecipeAuthor
  localeInfo: RecipeLocaleInfo
}

/**
 * 화면이 실제로 받는 모양. 계약 §3.3 과 딱 한 곳이 다르다:
 * `nutrition` 이 **null 일 수 있다**. 서버가 `provenance` 를 빠뜨렸거나 계약에 없는 값을
 * 보냈을 때 §1.1("앱은 이 값 없이 수치를 그리지 않는다")을 타입 수준에서 강제하기 위한
 * 것이다. 계약을 고치는 게 아니라, 계약 위반 응답을 화면이 조용히 그리지 못하게 막는다.
 */
export interface RecipeDetailView extends Omit<RecipeDetail, "nutrition"> {
  nutrition: RecipeNutrition | null
}

// ---------------------------------------------------------------------------
// §3.1 목록 · §2 저장 (상세 화면이 같은 타입을 읽고 쓴다)
// ---------------------------------------------------------------------------

export interface RecipeCard {
  id: number
  name: string
  summary: string | null
  category: string
  difficulty: string | null
  timeMin: number | null
  servings: number | null
  thumbnailUrl: string | null
  tags: string[]
  nutrition: RecipeNutrition
  /** 이 레시피에서 가장 빡빡한 영양소 하나. 카드에 이것만 강조한다(밀도 최소화). */
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
}

/** `PUT /recipes/{id}/save` — 절대 상태다(§2.1). 토글이 아니다. */
export interface RecipeSaveStateResponse {
  saved: boolean
  saveCount: number
}

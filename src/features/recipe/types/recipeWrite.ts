/**
 * 레시피 v2 작성 갈래의 계약 타입 — `docs/contract/recipe-v2.md` §3.2 / §3.5 / §3.6 을
 * 그대로 옮긴 것이다. 필드 이름·널 허용 여부를 여기서 바꾸면 서버와 어긋난다.
 *
 * ## 왜 이 파일이 따로 있는가
 * 목록·상세 갈래도 같은 `RecipeNutrition` / `NutrientBudget` 을 쓴다. 병렬 작업 중이라
 * 서로의 파일을 편집할 수 없어서 작성 갈래가 쓰는 것만 여기 두었다.
 * 오케스트레이터가 합칠 때 한 파일로 모으면 된다(보고에 적었다).
 *
 * ## 절대 규칙 (계약 §1.1)
 * `ckdGuide` · `aiSummary` 는 **여기 없다.** 필드를 되살리지 마라 — 검수 전 카탈로그가
 * 임상 지시를 내보내는 통로가 된다. `nutrition.provenance` 는 선택 항목이 아니다.
 * 앱은 provenance 없이 수치를 그리지 않는다.
 */

/** 이 수치가 어디서 왔는가. 계약 §3.2. */
export type NutritionProvenance =
  | "reference_estimate"
  | "computed_from_ingredients"
  | "author_supplied"
  | "nutritionist_reviewed"

/** 계약 §3.2. `provenance` 가 필수인 이유는 파일 머리말 참고. */
export interface RecipeNutrition {
  kcal: number
  proteinG: number
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  provenance: NutritionProvenance
  /** 식품표에서 못 찾았거나 무게를 몰라 합산에서 빠진 재료명. */
  unmatchedIngredients: string[]
}

export type NutrientKey = "sodium" | "potassium" | "phosphorus" | "protein"

/** 계약 §3.2. `percentOfRemaining` 이 null 이면 비율을 숨기고 절대값만 보여준다. */
export interface NutrientHeadline {
  key: NutrientKey
  amount: number
  unit: "mg" | "g"
  percentOfRemaining: number | null
}

/** 계약 §3.2. `proteinG` 는 체중 기록이 없으면 null 이다. */
export interface NutrientBudget {
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  proteinG: number | null
}

export interface NutritionPreviewIngredient {
  name: string
  amountText: string
}

/** 계약 §3.5 요청. */
export interface NutritionPreviewRequest {
  servings: number
  ingredients: NutritionPreviewIngredient[]
}

export type IngredientMatchReason =
  | "matched"
  | "unknown_amount"
  | "not_in_catalog"

/**
 * 계약 §3.5 `perIngredient` 의 항목. **레시피 전체 기준**이다(1인분으로 나뉜 것은
 * `nutrition` 뿐이다) — Foundation 담당이 계약에 명시를 요청한 항목이고 서버 구현이
 * 그렇게 되어 있다.
 */
export interface PerIngredientNutrition {
  name: string
  grams: number | null
  matched: boolean
  /**
   * `matched: false` 의 이유(계약 §3.3·§3.5). 화면이 무엇을 말할지가 여기서 갈린다 —
   * `unknown_amount` 는 "무게를 몰라 빠졌다", `not_in_catalog` 는 "그 이름을 못 찾았다".
   * 하나로 뭉치면 `흰쌀밥 210g`(무게를 안다)에도 "무게를 몰라" 라고 말한다.
   */
  reason: IngredientMatchReason
  sodiumMg: number
  potassiumMg: number
  phosphorusMg: number
  proteinG: number
  kcal: number
}

/** 계약 §3.5 응답. */
export interface NutritionPreviewResponse {
  /** 1인분 기준(servings 로 나눈 값). */
  nutrition: RecipeNutrition
  budget: NutrientBudget
  nutrientBreakdown: NutrientHeadline[]
  perIngredient: PerIngredientNutrition[]
}

export interface CreateRecipeStepInput {
  text: string
  imageObjectPath?: string | null
}

/** 계약 §3.6 요청. */
export interface CreateRecipeRequestV2 {
  name: string
  summary?: string | null
  description?: string | null
  category: string
  tags?: string[]
  timeMin?: number | null
  servings?: number | null
  difficulty?: string | null
  imageObjectPaths?: string[]
  ingredients: NutritionPreviewIngredient[]
  steps: CreateRecipeStepInput[]
  nutritionOverride?: {
    kcal: number
    proteinG: number
    sodiumMg: number
    potassiumMg: number
    phosphorusMg: number
  } | null
}

/**
 * `POST /recipes` 는 `RecipeDetail` 을 돌려준다(계약 §3.6). 작성 화면이 실제로 읽는
 * 것은 이 셋뿐이라 그만 적는다 — 상세 갈래의 `RecipeDetail` 과 합칠 때 이 타입을
 * 지우면 된다.
 */
export interface CreatedRecipeSummary {
  id: number
  name: string
  nutrition: RecipeNutrition
}

/**
 * 계약 §3.5 / §3.6 의 상한. 서버가 거절하기 전에 앱이 먼저 막는다 —
 * 400 을 받고 나서 "무엇이 문제였는지" 를 사용자가 알 수 없는 것이 더 나쁘다.
 */
export const RECIPE_WRITE_LIMITS = {
  nameMax: 200,
  summaryMax: 200,
  descriptionMax: 2000,
  categoryMax: 30,
  tagMax: 20,
  tagLength: 30,
  timeMinMin: 1,
  timeMinMax: 1440,
  servingsMin: 1,
  servingsMax: 20,
  imageMax: 5,
  ingredientMax: 50,
  ingredientNameMax: 100,
  ingredientAmountMax: 40,
  stepMax: 30,
  stepTextMax: 1000,
} as const

/** 계약 §3.5 "앱은 입력 정지 400ms 후 1회 호출한다". */
export const NUTRITION_PREVIEW_DEBOUNCE_MS = 400

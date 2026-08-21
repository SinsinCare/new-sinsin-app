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
  /**
   * **와이어에는 남아 있지만 작성 화면은 더 이상 채우지 않는다.** 난이도는 상세 메타
   * 한 줄에만 쓰이던 자유 문자열이라 폼에서 뺐다(시안에도 없다). 필드를 지우지 않는
   * 이유는 서버가 여전히 받고, 큐레이션 레시피가 값을 실어 오기 때문이다 — 타입에서
   * 지우면 그 갈래가 타입 에러를 낸다.
   */
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
 *
 * 예외는 `imageMax` 하나다. 그건 서버 상한(10)을 **옮겨 적은 값이 아니라 더 좁힌**
 * 값이다 — 서버가 받아 주기는 해도 보관하지 않기 때문이다(그 항목 머리말).
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
  /**
   * **1 이다. 5 가 아니다 — 서버가 첫 장만 저장하기 때문이다.**
   *
   * `sinsin-be-bun/src/domains/recipe/authoring.ts` 는 받은 배열에서 한 장만 꺼낸다.
   *
   *     const imagePaths = normalizeImagePaths(deps.storage, request.imageObjectPaths);
   *     ...
   *     imageUrl: imagePaths[0] ?? null,
   *
   * 그리고 그 한 값이 INSERT 에서 **세 컬럼 모두**에 같은 값으로 들어간다
   * (`image_url, thumbnail_url, detail_image_url` ← `${input.imageUrl}` 세 번).
   * 둘째 장부터는 들어갈 칸 자체가 없다. 서버 상한 `MAX_IMAGE_PATHS = 10` 은
   * "요청에 그만큼 실려도 400 을 내지 않는다" 는 뜻이지 "보관한다" 는 뜻이 아니다.
   *
   * 그래서 5 를 두면 화면이 5장을 올리게 해 놓고 등록 순간 4장을 조용히 버린다.
   * 수정 API 도 없어(`writeCopy.ts::RECIPE_EDIT_ENABLED === false`) 작성자가
   * 되돌릴 길이 없다 — 조용한 폴백이 고장을 정상처럼 보이게 하는 그 형태다.
   *
   * 버린 대안: 5장을 그대로 받고 등록 뒤에 "한 장만 저장됐어요" 를 띄우기. 이미
   * 잃은 뒤에 알리는 것이라 사용자가 할 수 있는 일이 없다. 못 지킬 약속을 애초에
   * 하지 않는 쪽을 골랐다.
   *
   * **서버에 다중 이미지 저장이 생기면(별도 표든 컬럼이든) 이 값을 되돌린다.**
   * 그때 고칠 곳은 여기 하나다 — `PhotoPickerRow`(`atLimit`) ·
   * `useRecipeWriteScreen.addPhotos`(`remaining`) · `writeFormState`(`slice`) 셋 다
   * 이 상수만 읽는다.
   */
  imageMax: 1,
  ingredientMax: 50,
  ingredientNameMax: 100,
  /**
   * 서버가 받는 `amountText` 하나의 상한(계약 §3.5). 화면은 이 칸을 **단위·수량 두
   * 칸으로 나눠 받고** `joinIngredientAmount` 로 합쳐 보내므로, 이 값은 **합친 뒤**의
   * 상한이다. 칸별 상한은 아래 둘이다.
   */
  ingredientAmountMax: 40,
  /**
   * 단위 칸(그램이 실리는 칸) · 수량 칸의 `maxLength`.
   *
   * 20 + 1(사이 공백) + 19 = 40 이라 **두 칸을 꽉 채워도 합산 상한을 넘지 않는다.**
   * 합친 뒤에 자르는 방법도 있었지만 그러면 사용자가 다 적은 글자가 등록 순간
   * 조용히 사라진다 — 칸에서 미리 막으면 안 들어가는 것이 손가락에 보인다.
   * 그램이 실리는 쪽에 한 글자를 더 준 이유: `1 1/2큰술 (200g)` 처럼 단위 칸이
   * 길어지는 표기가 실제로 있고, 서버 파서가 읽는 것도 그 칸이다.
   */
  ingredientUnitMax: 20,
  ingredientCountMax: 19,
  stepMax: 30,
  stepTextMax: 1000,
} as const

/** 계약 §3.5 "앱은 입력 정지 400ms 후 1회 호출한다". */
export const NUTRITION_PREVIEW_DEBOUNCE_MS = 400

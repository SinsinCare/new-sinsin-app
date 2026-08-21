/**
 * 레시피 v2 상세 서비스. 계약 `docs/contract/recipe-v2.md` §2·§3 의 엔드포인트를 그대로 부른다.
 *
 * 왜 모의 경로가 붙어 있는가:
 *   서버 v2 엔드포인트(`/recipes/{id}` 새 모양, `/save`, `/views`, `/reviews`)가 붙기 전에
 *   화면을 완성해야 한다. 그래서 `recipeV2Mock.enabled` 하나로 갈라지고, 모의 payload 는
 *   **계약 §6.2 예시 그대로**다. 화면에는 모의 데이터가 한 줄도 없다 — 서버가 붙으면
 *   `recipeV2Mock.enabled = false`(또는 `EXPO_PUBLIC_RECIPE_V2_MOCK=false`) 하나로 끝난다.
 *
 * 모의 저장소는 **상태를 가진다**. 저장/리뷰가 절대 상태 PUT(§2.1)이라 멱등이어야 하고,
 * 화면의 낙관 갱신이 되돌려지지 않는지 눈으로 확인해야 하기 때문이다.
 *
 * 매핑에서 지키는 것(계약 §1.1):
 *   `provenance` 가 없거나 계약에 없는 값이면 `nutrition` 을 **null 로 만든다.** 0 으로
 *   채우거나 "추정값" 으로 가정하지 않는다 — 화면은 그때 수치를 그리지 않는다.
 *   `ckdGuide`/`aiSummary` 는 읽지도 않는다(필드 자체를 없앤 것이 v2 다).
 */
import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { resolveProvenance } from "../components/detail/recipeDetailModel"
import { findMockRecipe, type MockRecipe } from "./recipeListV2MockCatalog"
import {
  NUTRIENT_KEYS,
  type ContentLocale,
  type DeleteMyReviewResponse,
  type IngredientMatchReason,
  type MyReview,
  type NutrientBudget,
  type NutrientHeadline,
  type NutrientKey,
  type RatingSummary,
  type RecipeDetailView,
  type RecipeIngredient,
  type RecipeNutrition,
  type RecipeSaveStateResponse,
  type RecipeStep,
  type Review,
  type ReviewListResponse,
  type ReviewSort,
  type UpsertMyReviewRequest,
  type UpsertMyReviewResponse,
} from "../types/recipeV2"

/**
 * 서버 v2 가 붙기 전까지 켜 둔다. 오케스트레이터는 이 한 줄(또는 env)만 끄면 된다.
 * `enabled` 를 런타임에 바꿀 수 있게 둔 이유: 테스트가 실제 호출을 만들지 않고 두 경로를
 * 모두 통과시킬 수 있어야 한다.
 */
export const recipeV2Mock = {
  enabled: process.env.EXPO_PUBLIC_RECIPE_V2_MOCK !== "false",
  /** 모의 응답 지연(ms). 로딩 상태가 실제로 보이는지 확인하려고 둔다. */
  latencyMs: 220,
}

// ---------------------------------------------------------------------------
// 와이어 → 화면 매핑
// ---------------------------------------------------------------------------

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {}
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function nullableNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function bool(value: unknown): boolean {
  return value === true
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : []
}

/** provenance 가 계약 밖이면 null — 수치를 그리지 않게 한다(§1.1). */
export function mapNutrition(raw: unknown): RecipeNutrition | null {
  const record = asRecord(raw)
  const provenance = resolveProvenance(record.provenance)
  if (provenance == null) return null
  return {
    kcal: num(record.kcal),
    proteinG: num(record.proteinG),
    sodiumMg: num(record.sodiumMg),
    potassiumMg: num(record.potassiumMg),
    phosphorusMg: num(record.phosphorusMg),
    provenance,
    unmatchedIngredients: strList(record.unmatchedIngredients),
  }
}

function mapBudget(raw: unknown): NutrientBudget {
  const record = asRecord(raw)
  return {
    sodiumMg: num(record.sodiumMg),
    potassiumMg: num(record.potassiumMg),
    phosphorusMg: num(record.phosphorusMg),
    proteinG: nullableNum(record.proteinG),
  }
}

const NUTRIENT_KEY_SET = new Set<string>(NUTRIENT_KEYS)

function mapBreakdown(raw: unknown): NutrientHeadline[] {
  if (!Array.isArray(raw)) return []
  const result: NutrientHeadline[] = []
  for (const item of raw) {
    const record = asRecord(item)
    const key = str(record.key)
    if (!NUTRIENT_KEY_SET.has(key)) continue
    result.push({
      key: key as NutrientKey,
      amount: num(record.amount),
      unit: record.unit === "g" ? "g" : "mg",
      percentOfRemaining: nullableNum(record.percentOfRemaining),
    })
  }
  return result
}

/**
 * `ordinal` 은 화면에서 **행의 식별자**(체크 상태 키·React key)로 쓰인다. 그래서 양의 정수가
 * 아니면 순서로 바꿔 넣는다 — 서버가 전부 0 을 보내면 한 재료를 체크했을 때 전부 체크된다.
 */
function ordinalOr(value: unknown, index: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : index + 1
}

/**
 * `reason` 을 서버가 안 줄 때(구버전 응답) **`grams` 로 되짚는다.** 기본값을
 * `not_in_catalog` 로 두면 안 된다 — 그것이 바로 고친 거짓말이다(`참기름 소량` 은
 * 식품표에 있는데 "없다" 고 말했다). 그램이 없으면 매칭을 시도했을 수 없으므로
 * `unknown_amount` 가 사실이다.
 */
function mapMatchReason(
  raw: unknown,
  matched: boolean,
  grams: number | null,
): IngredientMatchReason {
  if (matched) return "matched"
  if (raw === "unknown_amount" || raw === "not_in_catalog") return raw
  return grams === null ? "unknown_amount" : "not_in_catalog"
}

function mapIngredients(raw: unknown): RecipeIngredient[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const record = asRecord(item)
    const grams = nullableNum(record.grams)
    const matched = bool(record.matched)
    return {
      ordinal: ordinalOr(record.ordinal, index),
      name: str(record.name),
      amountText: str(record.amountText),
      grams,
      matched,
      reason: mapMatchReason(record.reason, matched, grams),
    }
  })
}

function mapSteps(raw: unknown): RecipeStep[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const record = asRecord(item)
    return {
      ordinal: ordinalOr(record.ordinal, index),
      text: str(record.text),
      imageUrl: nullableStr(record.imageUrl),
      timerSeconds: nullableNum(record.timerSeconds),
    }
  })
}

const EMPTY_DISTRIBUTION: RatingSummary["distribution"] = [0, 0, 0, 0, 0]

export function mapRating(raw: unknown): RatingSummary {
  const record = asRecord(raw)
  const distribution = Array.isArray(record.distribution)
    ? record.distribution
    : []
  const counts = EMPTY_DISTRIBUTION.map((_, index) =>
    num(distribution[index]),
  ) as unknown as RatingSummary["distribution"]
  const count = num(record.count)
  return {
    // 리뷰가 없으면 average 는 null 이다 — 0.0 을 만들지 않는다(§3.4).
    average: count > 0 ? nullableNum(record.average) : null,
    count,
    distribution: counts,
  }
}

function mapMyReview(raw: unknown): MyReview | null {
  if (raw == null) return null
  const record = asRecord(raw)
  const rating = nullableNum(record.rating)
  if (rating == null) return null
  return {
    rating,
    body: nullableStr(record.body),
    createdAt: str(record.createdAt),
    updatedAt: str(record.updatedAt),
  }
}

function mapLocale(value: unknown, fallback: ContentLocale): ContentLocale {
  return value === "en" ? "en" : value === "ko" ? "ko" : fallback
}

export function mapRecipeDetail(
  raw: unknown,
  requestedLocale: ContentLocale,
): RecipeDetailView {
  const record = asRecord(raw)
  const localeInfo = asRecord(record.localeInfo)
  return {
    id: num(record.id),
    name: str(record.name),
    summary: nullableStr(record.summary),
    description: nullableStr(record.description),
    category: str(record.category),
    difficulty: nullableStr(record.difficulty),
    timeMin: nullableNum(record.timeMin),
    servings: nullableNum(record.servings),
    heroImageUrl: nullableStr(record.heroImageUrl),
    heroImageObjectPath: nullableStr(record.heroImageObjectPath),
    /*
      **`null` 과 빈 배열을 구별한다.** `null` 은 "남의 레시피라 안 준다" 이고
      빈 배열은 "내 레시피인데 태그를 하나도 안 골랐다" 이다. 둘을 뭉개면 수정 화면이
      "모른다" 를 "없다" 로 읽어, 태그를 지운 적 없는 사용자의 태그를 지운다.
    */
    authoredTags: record.authoredTags == null ? null : strList(record.authoredTags),
    tags: strList(record.tags),
    nutrition: mapNutrition(record.nutrition),
    budget: mapBudget(record.budget),
    nutrientBreakdown: mapBreakdown(record.nutrientBreakdown),
    ingredients: mapIngredients(record.ingredients),
    steps: mapSteps(record.steps),
    rating: mapRating(record.rating),
    myReview: mapMyReview(record.myReview),
    saveCount: num(record.saveCount),
    saved: bool(record.saved),
    authored: bool(record.authored),
    author: {
      nickName: str(asRecord(record.author).nickName),
      isCurated: bool(asRecord(record.author).isCurated),
    },
    localeInfo: {
      requested: mapLocale(localeInfo.requested, requestedLocale),
      contentLocale: mapLocale(localeInfo.contentLocale, requestedLocale),
      // 명시하지 않으면 "완전 번역" 으로 가정하지 않는다 — 반쪽 번역을 조용히 숨기는 쪽이 나쁘다.
      fullyTranslated: localeInfo.fullyTranslated !== false,
    },
  }
}

function mapReviewList(raw: unknown): ReviewListResponse {
  const record = asRecord(raw)
  const items = Array.isArray(record.items) ? record.items : []
  return {
    items: items.map((item) => {
      const reviewRecord = asRecord(item)
      return {
        id: num(reviewRecord.id),
        // 필드가 없는 옛 서버는 `null` 이 된다 — "모른다" 와 같은 뜻이고, 판정이
        // 그때 이름 축으로 되돌아간다(`isAuthorBlocked`). 0 으로 채우면 안 된다.
        authorId: nullableNum(reviewRecord.authorId),
        authorNickName: str(reviewRecord.authorNickName),
        rating: num(reviewRecord.rating),
        body: nullableStr(reviewRecord.body),
        createdAt: str(reviewRecord.createdAt),
        mine: bool(reviewRecord.mine),
      } satisfies Review
    }),
    nextCursor: nullableStr(record.nextCursor),
    hasMore: bool(record.hasMore),
    summary: mapRating(record.summary),
  }
}

// ---------------------------------------------------------------------------
// 실제 호출
// ---------------------------------------------------------------------------

export interface ReviewListParams {
  limit?: number
  cursor?: string
  sort?: ReviewSort
}

export const recipeDetailV2Service = {
  async getRecipeDetail(
    recipeId: number,
    locale: ContentLocale,
  ): Promise<RecipeDetailView> {
    if (recipeV2Mock.enabled) return mockGetDetail(recipeId, locale)
    const { data } = await api.get(`/recipes/${recipeId}`, {
      params: { locale },
    })
    return mapRecipeDetail(asRecord(data).result, locale)
  },

  /** 절대 상태다(§2.1). 토글이 아니라 원하는 상태를 그대로 보낸다. */
  async setSaved(
    recipeId: number,
    saved: boolean,
  ): Promise<RecipeSaveStateResponse> {
    if (recipeV2Mock.enabled) return mockSetSaved(recipeId, saved)
    const { data } = await api.put(`/recipes/${recipeId}/save`, { saved })
    const result = asRecord(asRecord(data).result)
    return { saved: bool(result.saved), saveCount: num(result.saveCount) }
  },

  /** 조회 기록. 실패해도 화면은 아무 말도 하지 않는다(사용자가 요청한 동작이 아니다). */
  async recordView(recipeId: number): Promise<void> {
    if (recipeV2Mock.enabled) return
    await api.post(`/recipes/${recipeId}/views`)
  },

  async getReviews(
    recipeId: number,
    params: ReviewListParams = {},
  ): Promise<ReviewListResponse> {
    if (recipeV2Mock.enabled) return mockGetReviews(recipeId, params)
    const query: Record<string, string | number> = {
      limit: params.limit ?? 20,
      sort: params.sort ?? "recent",
    }
    if (params.cursor) query.cursor = params.cursor
    const { data } = await api.get(`/recipes/${recipeId}/reviews`, {
      params: query,
    })
    return mapReviewList(asRecord(data).result)
  },

  /** 같은 사용자가 다시 부르면 갱신이다(멱등, §3.4). */
  async upsertMyReview(
    recipeId: number,
    request: UpsertMyReviewRequest,
  ): Promise<UpsertMyReviewResponse> {
    if (recipeV2Mock.enabled) return mockUpsertReview(recipeId, request)
    const { data } = await api.put(`/recipes/${recipeId}/reviews/mine`, request)
    const result = asRecord(asRecord(data).result)
    const review = mapMyReview(result.review)
    return {
      review: review ?? {
        rating: request.rating,
        body: request.body ?? null,
        createdAt: "",
        updatedAt: "",
      },
      summary: mapRating(result.summary),
    }
  },

  async deleteMyReview(recipeId: number): Promise<DeleteMyReviewResponse> {
    if (recipeV2Mock.enabled) return mockDeleteReview(recipeId)
    const { data } = await api.delete(`/recipes/${recipeId}/reviews/mine`)
    return { summary: mapRating(asRecord(asRecord(data).result).summary) }
  },
}

// ---------------------------------------------------------------------------
// 모의 경로 — 계약 §6.2 예시 payload
// ---------------------------------------------------------------------------

interface MockState {
  saved: boolean
  saveCount: number
  reviews: Review[]
  myReview: MyReview | null
}

const mockStates = new Map<number, MockState>()

function mockState(recipeId: number): MockState {
  const existing = mockStates.get(recipeId)
  if (existing) return existing
  const created: MockState = {
    saved: false,
    saveCount: 1228,
    reviews: MOCK_REVIEWS.map((review) => ({ ...review })),
    myReview: null,
  }
  mockStates.set(recipeId, created)
  return created
}

/** 테스트·개발 중 모의 상태를 초기화한다. */
export function resetRecipeV2Mock(): void {
  mockStates.clear()
}

function delay<T>(value: T): Promise<T> {
  if (recipeV2Mock.latencyMs <= 0) return Promise.resolve(value)
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), recipeV2Mock.latencyMs),
  )
}

const MOCK_REVIEWS: Review[] = [
  {
    id: 9001,
    authorId: 9101,
    authorNickName: "잔잔한하루",
    rating: 5,
    body: "간을 반으로 줄여도 충분히 맛있었어요. 당면은 살짝 덜 익혀야 좋아요.",
    createdAt: "2026-07-24T02:11:00.000Z",
    mine: false,
  },
  {
    id: 9002,
    authorId: 9102,
    authorNickName: "물한잔",
    rating: 4,
    body: "양파를 더 넣으니 단맛이 살아요. 다음엔 참기름을 조금만.",
    createdAt: "2026-07-22T11:40:00.000Z",
    mine: false,
  },
  {
    id: 9003,
    authorId: 9103,
    authorNickName: "저녁담당",
    rating: 5,
    body: null,
    createdAt: "2026-07-20T09:05:00.000Z",
    mine: false,
  },
  {
    id: 9004,
    authorId: 9104,
    authorNickName: "봄나물",
    rating: 3,
    body: "재료 손질이 생각보다 오래 걸렸어요.",
    createdAt: "2026-07-18T13:30:00.000Z",
    mine: false,
  },
]

/** 계약 §6.2 의 숫자를 그대로 쓴다(나트륨 376mg = 남은 양의 24% 등). */
function mockDetailPayload(
  recipe: MockRecipe,
  locale: ContentLocale,
): RawRecord {
  const state = mockState(recipe.id)
  const summary = mockSummary(state)
  return {
    id: recipe.id,
    /**
     * **이름·분류·시간은 카탈로그에서 가져온다.** 종전에는 어떤 id 로 물어도 "잡채덮밥" 을
     * 돌려줘서, 모의 모드에서는 **누른 카드와 열린 상세가 달라도** 아무도 눈치채지
     * 못했다(정확히 지금 고치는 결함의 부류다). 나머지 본문(재료·순서)은 계약 §6.2 예시
     * 그대로 두는데, 12건 각각의 조리법을 지어내면 그게 또 하나의 가짜 데이터가 된다.
     */
    name: recipe.name,
    summary:
      recipe.summary ?? "당면과 채소를 간장 조금으로 볶아 밥 위에 올린 한 그릇",
    description:
      "채소를 먼저 볶아 단맛을 낸 뒤 간장을 마지막에 둘러 간을 줄였습니다. 당면은 물에 오래 불리지 않고 살짝 덜 익혀야 덮밥으로 먹기 좋습니다.",
    category: recipe.category,
    difficulty: recipe.difficulty,
    timeMin: recipe.timeMin,
    servings: recipe.servings,
    heroImageUrl: null,
    heroImageObjectPath: null,
    // 목에도 임상 태그를 싣는다 — 이게 비어 있으면 목 모드에서 수정 왕복이
    // 성공한 것처럼 보이고, 실제 서버에서만 태그가 날아간다.
    authoredTags: ["저염", "CKD3"],
    tags: recipe.tags,
    nutrition: {
      kcal: 520,
      proteinG: 7,
      sodiumMg: 376,
      potassiumMg: 580,
      phosphorusMg: 218,
      provenance: "reference_estimate",
      unmatchedIngredients: ["당면(건조)", "다진마늘·파·참깨"],
    },
    budget: {
      sodiumMg: 1567,
      potassiumMg: 3867,
      phosphorusMg: 1038,
      // 체중 기록이 없는 사용자 — 단백질만 null 인 경로를 화면에서 확인해야 한다.
      proteinG: null,
    },
    nutrientBreakdown: [
      { key: "sodium", amount: 376, unit: "mg", percentOfRemaining: 24 },
      { key: "potassium", amount: 580, unit: "mg", percentOfRemaining: 15 },
      { key: "phosphorus", amount: 218, unit: "mg", percentOfRemaining: 21 },
      { key: "protein", amount: 7, unit: "g", percentOfRemaining: null },
    ],
    ingredients: [
      {
        ordinal: 1,
        name: "흑미흰밥",
        amountText: "70g",
        grams: 70,
        matched: true,
      },
      {
        ordinal: 2,
        name: "당면(건조)",
        amountText: "60g",
        grams: 60,
        matched: false,
      },
      {
        ordinal: 3,
        name: "양파",
        amountText: "1/4개",
        grams: null,
        matched: true,
      },
      {
        ordinal: 4,
        name: "저염 간장",
        amountText: "1작은술",
        grams: 5,
        matched: true,
      },
      {
        ordinal: 5,
        name: "다진마늘·파·참깨",
        amountText: "소량",
        grams: null,
        matched: false,
      },
    ],
    steps: [
      {
        ordinal: 1,
        text: "당면은 미지근한 물에 20분 불려 둡니다. 물을 끓이지 않고 불려야 덮밥에서 퍼지지 않습니다.",
        imageUrl: null,
        timerSeconds: 1200,
      },
      {
        ordinal: 2,
        text: "양파와 채소를 채 썰어 중불에서 2분 볶습니다.",
        imageUrl: null,
        timerSeconds: 120,
      },
      {
        ordinal: 3,
        text: "불린 당면을 넣고 저염 간장을 둘러 3분 더 볶습니다. 간장은 마지막에 넣어야 같은 양으로 더 짜게 느껴집니다.",
        imageUrl: null,
        timerSeconds: 180,
      },
      {
        ordinal: 4,
        text: "밥 위에 올리고 다진 파와 참깨를 조금 뿌립니다.",
        imageUrl: null,
        timerSeconds: null,
      },
    ],
    rating: summary,
    myReview: state.myReview,
    saveCount: state.saveCount,
    saved: state.saved,
    authored: false,
    author: { nickName: "신신당부 큐레이션", isCurated: true },
    localeInfo: {
      requested: locale,
      contentLocale: "ko",
      // 영문 요청에는 재료·순서 번역이 없다 — 안내 배너 경로를 화면에서 확인해야 한다.
      fullyTranslated: locale === "ko",
    },
  }
}

function mockSummary(state: MockState): RatingSummary {
  const distribution: RatingSummary["distribution"] = [0, 0, 0, 0, 0]
  let sum = 0
  for (const review of state.reviews) {
    const index = Math.min(5, Math.max(1, Math.round(review.rating))) - 1
    distribution[index] += 1
    sum += review.rating
  }
  const count = state.reviews.length
  return {
    average: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
    count,
    distribution,
  }
}

/**
 * 모의 경로의 **존재 확인**. 카탈로그에 없는 id 면 서버와 같은 404 를 던진다.
 *
 * ## 왜 이 함수가 생겼나
 *
 * 모의 상세는 어떤 정수 id 로 물어도 레시피를 하나 만들어 돌려줬다. 그 관대함이
 * **id 결함을 통째로 가렸다** — 목록이 서버에 없는 id 를 내보내도 모의 모드에서는 상세가
 * 멀쩡히 열리고, 서버를 붙이는 순간에만 404 로 터진다. 목록이 만드는 id 와 상세가 받는
 * id 가 같아야 한다는 계약을 모의 모드에서도 지키게 하는 것이 이 함수다.
 *
 * 코드는 서버가 실제로 주는 값을 쓴다(`COMMON_ERROR_004`, 404) — 그래야 화면의 분류기
 * (`classifyFetchFailure`)가 실서버와 **같은 갈래**로 떨어진다.
 */
function assertMockRecipeExists(recipeId: number): MockRecipe {
  const recipe = findMockRecipe(recipeId)
  if (recipe) return recipe
  throw new ApiError(
    `mock: recipe ${recipeId} not found`,
    "COMMON_ERROR_004",
    404,
  )
}

async function mockGetDetail(
  recipeId: number,
  locale: ContentLocale,
): Promise<RecipeDetailView> {
  const recipe = assertMockRecipeExists(recipeId)
  return mapRecipeDetail(await delay(mockDetailPayload(recipe, locale)), locale)
}

async function mockSetSaved(
  recipeId: number,
  saved: boolean,
): Promise<RecipeSaveStateResponse> {
  const state = mockState(recipeId)
  if (state.saved !== saved) {
    state.saved = saved
    state.saveCount += saved ? 1 : -1
  }
  return delay({ saved: state.saved, saveCount: state.saveCount })
}

const MOCK_REVIEW_PAGE_SIZE = 3

async function mockGetReviews(
  recipeId: number,
  params: ReviewListParams,
): Promise<ReviewListResponse> {
  // 상세와 같은 관문. 없는 레시피의 리뷰는 서버도 404 다 — 상세만 404 나고 리뷰는
  // 성공하면 화면이 반쯤 살아 있는, 실서버에는 없는 상태가 모의에서만 만들어진다.
  assertMockRecipeExists(recipeId)
  const state = mockState(recipeId)
  const sorted = [...state.reviews].sort((a, b) =>
    params.sort === "helpful"
      ? b.rating - a.rating || b.id - a.id
      : b.createdAt.localeCompare(a.createdAt) || b.id - a.id,
  )
  const limit = params.limit ?? MOCK_REVIEW_PAGE_SIZE
  const offset = params.cursor ? Number(params.cursor) : 0
  const start = Number.isFinite(offset) ? Math.max(0, offset) : 0
  const page = sorted.slice(start, start + limit)
  const nextOffset = start + page.length
  return delay({
    items: page,
    nextCursor: nextOffset < sorted.length ? String(nextOffset) : null,
    hasMore: nextOffset < sorted.length,
    summary: mockSummary(state),
  })
}

async function mockUpsertReview(
  recipeId: number,
  request: UpsertMyReviewRequest,
): Promise<UpsertMyReviewResponse> {
  const state = mockState(recipeId)
  const now = new Date().toISOString()
  const existing = state.reviews.find((review) => review.mine)
  if (existing) {
    existing.rating = request.rating
    existing.body = request.body ?? null
  } else {
    state.reviews.unshift({
      id: 1,
      // 목 전용 자리표시자. 실서버는 로그인한 사람의 id 를 준다.
      authorId: 9100,
      authorNickName: "나",
      rating: request.rating,
      body: request.body ?? null,
      createdAt: now,
      mine: true,
    })
  }
  state.myReview = {
    rating: request.rating,
    body: request.body ?? null,
    createdAt: state.myReview?.createdAt ?? now,
    updatedAt: now,
  }
  return delay({ review: state.myReview, summary: mockSummary(state) })
}

async function mockDeleteReview(
  recipeId: number,
): Promise<DeleteMyReviewResponse> {
  const state = mockState(recipeId)
  state.reviews = state.reviews.filter((review) => !review.mine)
  state.myReview = null
  return delay({ summary: mockSummary(state) })
}

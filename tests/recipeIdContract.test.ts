/**
 * **목록이 만드는 id 는 상세가 받는 id 여야 한다.** 그리고 그 계약이 깨졌을 때 화면은
 * 사실대로 말해야 한다.
 *
 * ## 이 파일이 생긴 계기 (실측)
 *
 * 시뮬레이터에서 `sinsin:///recipe/1` — dev DB(레시피 id 21~195)에 없는 id — 를 열면
 * 앱이 `GET /api/v1/recipes/1` 과 `GET /api/v1/recipes/1/reviews` 를 부르고, 서버가 둘 다
 * 404 `COMMON_ERROR_004` 로 거절한다. 그런데 화면은 이렇게 말했다:
 *
 *     레시피를 불러오지 못했어요
 *     인터넷 연결을 확인한 뒤 다시 시도해 주세요.
 *
 * 두 개의 결함이 겹쳐 있다.
 *
 * 1. **없는 id 로 이동할 수 있다.** 그리고 그게 오래 눈에 띄지 않은 이유가 있다 —
 *    모의 상세(`recipeDetailV2Service` 의 mock 경로)가 **어떤 정수 id 로 물어도**
 *    레시피를 하나 만들어 돌려줬다. 모의 모드에서는 잘못된 id 도, "누른 카드와 다른
 *    레시피가 열리는 것" 도 보이지 않는다. 서버를 붙이는 순간에만 404 로 터진다.
 *    즉 **모의가 결함을 가리는 방향으로 관대했다.**
 * 2. **404 를 와이파이 문제로 알린다.** 사용자는 고칠 수 없는 것(자기 인터넷)을 고치려
 *    하고, 우리는 그 제보를 "네트워크 이슈" 로 닫는다. 화면이 원인을 가린다.
 *
 * ## 근거를 어디에 뒀나 — 실서버가 아니라 픽스처다 (그리고 그 이유)
 *
 * 이 스위트는 **네트워크를 타지 않는다.** 게이트가 백엔드 없이 도는 jest 이고
 * (`tests/food.test.ts` 하나만 실서버 스위트라 따로 빠져 있다), 실서버에 매달린 회귀
 * 테스트는 백엔드가 내려간 날 "이 결함이 돌아왔다" 와 "서버가 꺼졌다" 를 구분하지 못한다.
 *
 * 대신 두 축으로 실제 모양에 묶어 둔다.
 *  - **응답 픽스처는 실측한 것**이다. 2026-07-31 dev 백엔드(`GET /api/v1/recipes?limit=5`)가
 *    준 항목의 모양·값을 그대로 옮겼다(id 21 잡채덮밥 (저염), id 22 곤드레밥).
 *  - **정의역은 코드가 만든다.** 카탈로그를 상수로 베끼지 않고 `mockRecipeIds()` 로 뽑아
 *    돌리므로, 카탈로그가 늘어도 계약이 저절로 따라온다.
 */
/* eslint-disable import/first --
 * `apiClient` 는 expo-secure-store(ESM)를 끌고 와서 node 환경 jest 가 파싱하지 못한다.
 * 다른 서비스 테스트(`recipeDetailV2.test.ts`)와 같은 방식으로 인스턴스를 세워 둔다.
 */
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}))

import { parseRecipeId } from "@/src/features/recipe/components/detail/recipeDetailModel"
import {
  recipeDetailV2Service,
  recipeV2Mock,
  resetRecipeV2Mock,
} from "@/src/features/recipe/services/recipeDetailV2Service"
import {
  findMockRecipe,
  mockRecipeIds,
  queryMockRecipeList,
} from "@/src/features/recipe/services/recipeListV2MockCatalog"
import { normalizeRecipeListResponse } from "@/src/features/recipe/services/recipeListV2Service"
import { recipeFailureCopy } from "@/src/features/recipe/utils/recipeFetchError"
import { ApiError } from "@/src/services/core/apiError"
import { classifyFetchFailure } from "@/src/shared/utils/fetchFailure"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"
import enRecipe from "@/src/i18n/locales/en/recipe.json"

/**
 * 2026-07-31 dev 백엔드 `GET /api/v1/recipes?limit=5` 응답의 앞 두 건.
 * **손으로 지어낸 값이 아니다** — 실제 봉투(`result.items`)에서 그대로 옮겼다.
 */
const LIVE_LIST_ENVELOPE = {
  items: [
    {
      id: 21,
      name: "잡채덮밥 (저염)",
      summary: null,
      category: "한식",
      difficulty: "보통",
      timeMin: 35,
      servings: 1,
      thumbnailUrl: null,
      tags: ["#한식"],
      nutrition: {
        kcal: 650,
        proteinG: 7,
        sodiumMg: 376,
        potassiumMg: 580,
        phosphorusMg: 218,
        provenance: "reference_estimate",
        unmatchedIngredients: [],
      },
      headline: {
        key: "phosphorus",
        amount: 218,
        unit: "mg",
        percentOfRemaining: 24,
      },
      rating: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
      saveCount: 0,
      saved: false,
      authored: false,
    },
    {
      id: 22,
      name: "곤드레밥",
      summary: null,
      category: "한식",
      difficulty: "쉬움",
      timeMin: 50,
      servings: 1,
      thumbnailUrl: null,
      tags: ["#한식"],
      nutrition: {
        kcal: 356,
        proteinG: 7,
        sodiumMg: 364,
        potassiumMg: 370,
        phosphorusMg: 86,
        provenance: "reference_estimate",
        unmatchedIngredients: [],
      },
      headline: {
        key: "sodium",
        amount: 364,
        unit: "mg",
        percentOfRemaining: 18,
      },
      rating: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
      saveCount: 0,
      saved: false,
      authored: false,
    },
  ],
  nextCursor: null,
  hasMore: false,
  budget: {
    sodiumMg: 2000,
    potassiumMg: 2500,
    phosphorusMg: 900,
    proteinG: null,
  },
  totalCount: 175,
}

describe("목록 id → 상세 라우트 id (실서버 모양)", () => {
  it("실측 응답의 모든 카드 id 가 상세 라우트가 받아들이는 값이다", () => {
    const page = normalizeRecipeListResponse(LIVE_LIST_ENVELOPE)
    expect(page.items).toHaveLength(2)

    for (const card of page.items) {
      // 카드가 `/recipe/${card.id}` 로 이동한다(`app/(tabs)/recipe.tsx`).
      // 그 문자열을 상세 라우트가 그대로 되읽어야 왕복이 성립한다.
      expect(parseRecipeId(String(card.id))).toBe(card.id)
      expect(Number.isInteger(card.id)).toBe(true)
      expect(card.id).toBeGreaterThan(0)
    }
  })

  it("id 를 읽을 수 없는 행은 아예 카드가 되지 않는다 — 누를 수 없어야 한다", () => {
    /**
     * 이것이 "목 id" 가 화면에 새는 **두 번째 통로**다. 서버가(또는 우리가 만든 목이)
     * id 없는 행을 흘리면 카드가 `undefined` 로 이동해 `/recipe/undefined` 를 연다.
     * 정규화가 그런 행을 조용히 버리는지 여기서 못 박는다.
     */
    const page = normalizeRecipeListResponse({
      items: [
        { name: "id 가 없는 행" },
        { id: "12", name: "문자열 id 는 받는다" },
        { id: 0, name: "0 은 레시피가 아니다" },
        { id: -3, name: "음수" },
        { id: 1.5, name: "정수가 아니다" },
        { id: 21, name: "잡채덮밥 (저염)" },
      ],
    })

    expect(page.items.map((card) => card.id)).toEqual([12, 21])
    for (const card of page.items) {
      expect(parseRecipeId(String(card.id))).toBe(card.id)
    }
  })
})

describe("모의 카탈로그도 같은 계약을 진다", () => {
  const previousLatency = recipeV2Mock.latencyMs

  beforeAll(() => {
    recipeV2Mock.latencyMs = 0
  })
  afterAll(() => {
    recipeV2Mock.latencyMs = previousLatency
  })
  beforeEach(() => {
    resetRecipeV2Mock()
  })

  it("목록이 내보내는 id 는 전부 카탈로그가 아는 id 다", () => {
    const known = new Set(mockRecipeIds())
    // 정렬 5종을 모두 훑는다 — 정렬이 다른 레코드 집합을 내보내면 여기서 갈린다.
    for (const sort of [
      "recommended",
      "recent",
      "rating",
      "saves",
      "quick",
    ] as const) {
      for (const card of queryMockRecipeList({ sort, limit: 50 }).items) {
        expect(known.has(card.id)).toBe(true)
        expect(parseRecipeId(String(card.id))).toBe(card.id)
      }
    }
  })

  it("카탈로그의 모든 id 로 상세가 열리고, **누른 카드와 같은 레시피**가 온다", async () => {
    for (const id of mockRecipeIds()) {
      const detail = await recipeDetailV2Service.getRecipeDetail(id, "ko")
      expect(detail.id).toBe(id)
      // 종전 모의는 어떤 id 로 물어도 "잡채덮밥" 을 돌려줬다. 그래서 "누른 것과 열린 것이
      // 다르다" 를 아무도 볼 수 없었다.
      expect(detail.name).toBe(findMockRecipe(id)?.name)
    }
  })

  it("카탈로그에 없는 id 는 모의에서도 404 다 — 서버를 붙이기 전에 터져야 한다", async () => {
    const unknown = Math.max(...mockRecipeIds()) + 1
    await expect(
      recipeDetailV2Service.getRecipeDetail(unknown, "ko"),
    ).rejects.toMatchObject({ statusCode: 404 })
    // 상세만 404 나고 리뷰는 성공하면, 실서버에는 없는 반쪽 화면이 모의에서만 생긴다.
    await expect(
      recipeDetailV2Service.getReviews(unknown, { limit: 3 }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe("실패 분류 — 404 를 인터넷 문제라고 하지 않는다", () => {
  it("404 는 NOT_FOUND 다 (NETWORK_FAILURE 가 아니다)", () => {
    const notFound = new ApiError(
      "레시피를 찾을 수 없습니다",
      "COMMON_ERROR_004",
      404,
    )
    expect(classifyFetchFailure(notFound, "recipe-detail")).toBe("NOT_FOUND")
  })

  it("갈래마다 다른 판정이 나온다", () => {
    expect(
      classifyFetchFailure(
        new ApiError("네트워크", "NETWORK", undefined, true),
        "t",
      ),
    ).toBe("NETWORK_FAILURE")
    // 상태 코드가 아예 없는 오류도 "요청이 나가지 못했다" 로 읽는다.
    expect(classifyFetchFailure(new ApiError("끊김", "UNKNOWN"), "t")).toBe(
      "NETWORK_FAILURE",
    )
    expect(
      classifyFetchFailure(new ApiError("서버", "COMMON_ERROR_500", 500), "t"),
    ).toBe("SERVER_ERROR")
    expect(
      classifyFetchFailure(new ApiError("잘못된 요청", "COMMON_400", 400), "t"),
    ).toBe("REQUEST_REJECTED")
    // 인터셉터를 안 거친 우리 예외 — 통신 문제로 분류하면 원인을 영영 못 찾는다.
    expect(classifyFetchFailure(new Error("viewport 미확정"), "t")).toBe(
      "REQUEST_REJECTED",
    )
  })

  it("404 문구는 연결을 확인하라고 말하지 않고, 재시도 버튼도 주지 않는다", () => {
    const copy = recipeFailureCopy("NOT_FOUND")
    // 없는 레시피는 다시 눌러도 없다. 되는 일이 없는 버튼을 주지 않는다.
    expect(copy.retry).toBe(false)

    const ko = resolveKey(koRecipe, copy.bodyKey)
    const en = resolveKey(enRecipe, copy.bodyKey)
    expect(ko).not.toContain("인터넷 연결을 확인")
    expect(en?.toLowerCase()).not.toContain("check your connection")

    // 반대로 진짜 통신 실패에서는 **거기서만** 연결을 언급한다.
    expect(
      resolveKey(koRecipe, recipeFailureCopy("NETWORK_FAILURE").bodyKey),
    ).toContain("인터넷 연결을 확인")
  })

  it("모든 갈래의 문구 키가 ko·en 양쪽에 실제로 있다", () => {
    for (const kind of [
      "NETWORK_FAILURE",
      "SERVER_ERROR",
      "NOT_FOUND",
      "REQUEST_REJECTED",
    ] as const) {
      const copy = recipeFailureCopy(kind)
      for (const key of [copy.titleKey, copy.bodyKey, copy.actionKey]) {
        // 키가 없으면 i18next 는 키 문자열을 그대로 화면에 그린다. 조용한 실패다.
        expect(resolveKey(koRecipe, key)).toBeTruthy()
        expect(resolveKey(enRecipe, key)).toBeTruthy()
      }
    }
  })
})

/** 점으로 이어진 키를 로케일 JSON 에서 찾는다. 없으면 `undefined`. */
function resolveKey(bundle: unknown, key: string): string | undefined {
  let cursor: unknown = bundle
  for (const part of key.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return undefined
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return typeof cursor === "string" ? cursor : undefined
}

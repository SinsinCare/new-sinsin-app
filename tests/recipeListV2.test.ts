/* eslint-disable import/first --
 * apiClient 는 모듈 로드 시점에 EXPO_PUBLIC_BACKEND_URL 을 요구한다. 이 테스트는
 * 네트워크를 타지 않으므로 import 보다 먼저 목으로 갈아 끼운다(curatedRecipePresentation
 * 테스트와 같은 방식).
 */
const apiGet = jest.fn()

jest.mock("../src/services/core/apiClient", () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}))

import enRecipe from "../src/i18n/locales/en/recipe.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import {
  formatNutrientAmount,
  groupThousands,
  hasEstimatedNutrition,
  resolveCardHeadline,
  resolveCardMeta,
  resolveCardRating,
  resolveCardTags,
} from "../src/features/recipe/components/list/recipeCardFormat"
import {
  clearRecipeFilters,
  countRecipeFilters,
  EMPTY_RECIPE_FILTERS,
  listAppliedRecipeFilters,
  removeRecipeFilter,
  toggleRecipeFilter,
  toRecipeListQueryFilters,
} from "../src/features/recipe/components/list/recipeListFilterModel"
import {
  nextFabCollapsed,
  resolveResultCount,
  shouldShowSuggestions,
} from "../src/features/recipe/components/list/recipeListPresentation"
import {
  pickHeadline,
  queryMockRecipeList,
  queryMockSuggestions,
} from "../src/features/recipe/services/recipeListV2MockCatalog"
import {
  normalizeRecipeCard,
  normalizeRecipeListResponse,
  normalizeSuggestions,
  RECIPE_LIST_V2_MOCK,
  recipeListV2Service,
} from "../src/features/recipe/services/recipeListV2Service"
import type {
  RecipeCard,
  RecipeNutrition,
} from "../src/features/recipe/types/recipeListV2"

function nutrition(overrides: Partial<RecipeNutrition> = {}): RecipeNutrition {
  return {
    kcal: 650,
    proteinG: 7,
    sodiumMg: 376,
    potassiumMg: 580,
    phosphorusMg: 218,
    provenance: "reference_estimate",
    unmatchedIngredients: [],
    ...overrides,
  }
}

function card(overrides: Partial<RecipeCard> = {}): RecipeCard {
  return {
    id: 1,
    name: "곤드레밥",
    summary: null,
    category: "한식",
    difficulty: "쉬움",
    timeMin: 35,
    servings: 1,
    thumbnailUrl: null,
    tags: [],
    nutrition: nutrition(),
    headline: {
      key: "sodium",
      amount: 376,
      unit: "mg",
      percentOfRemaining: 24,
    },
    rating: { average: 4.7, count: 1227, distribution: [0, 0, 0, 0, 0] },
    saveCount: 1228,
    saved: false,
    authored: false,
    ...overrides,
  }
}

describe("검색이 실제로 목록을 바꾼다 (시안 Typing≡Typed 결함)", () => {
  it("검색어를 넣으면 결과와 개수가 함께 줄어든다", () => {
    const all = queryMockRecipeList({})
    const rice = queryMockRecipeList({ q: "밥" })

    expect(all.totalCount).toBeGreaterThan(0)
    expect(rice.totalCount).toBeGreaterThan(0)
    expect(rice.totalCount).toBeLessThan(all.totalCount as number)
    expect(rice.items.length).toBe(rice.totalCount)
    for (const item of rice.items) {
      expect(
        `${item.name}${item.summary ?? ""}${item.category}${item.tags.join("")}`,
      ).toContain("밥")
    }
  })

  it("공백·대소문자를 무시하고 찾는다", () => {
    expect(queryMockRecipeList({ q: "  곤드레 밥 " }).totalCount).toBe(
      queryMockRecipeList({ q: "곤드레밥" }).totalCount,
    )
  })

  it("맞는 것이 없으면 빈 목록 + 0개다 (0개를 숨기지 않는다)", () => {
    const none = queryMockRecipeList({ q: "존재하지않는레시피이름" })
    expect(none.items).toEqual([])
    expect(none.totalCount).toBe(0)
    expect(none.hasMore).toBe(false)
    expect(none.nextCursor).toBeNull()
  })

  it("자동완성은 입력이 있을 때만 제안한다", () => {
    expect(queryMockSuggestions("")).toEqual([])
    expect(queryMockSuggestions("   ")).toEqual([])
    const suggestions = queryMockSuggestions("밥")
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some((entry) => entry.kind === "recipe")).toBe(true)
    for (const entry of suggestions) {
      expect(entry.text.length).toBeGreaterThan(0)
    }
  })

  it("자동완성 상한을 넘기지 않는다", () => {
    expect(
      queryMockSuggestions("ㅏ".repeat(0) + "밥", 2).length,
    ).toBeLessThanOrEqual(2)
  })
})

describe("정렬 5종 (계약 §3.1)", () => {
  it("빨리되는 = 조리시간 오름차순", () => {
    const times = queryMockRecipeList({ sort: "quick", limit: 50 }).items.map(
      (item) => item.timeMin ?? Number.MAX_SAFE_INTEGER,
    )
    expect([...times]).toEqual([...times].sort((a, b) => a - b))
  })

  it("저장많은 = 저장수 내림차순", () => {
    const saves = queryMockRecipeList({ sort: "saves", limit: 50 }).items.map(
      (item) => item.saveCount,
    )
    expect([...saves]).toEqual([...saves].sort((a, b) => b - a))
  })

  it("별점 = 리뷰 개수 우선, 그다음 평균 (인덱스가 개수 순이다)", () => {
    const items = queryMockRecipeList({ sort: "rating", limit: 50 }).items
    for (let index = 1; index < items.length; index += 1) {
      const prev = items[index - 1]
      const next = items[index]
      expect(prev.rating.count).toBeGreaterThanOrEqual(next.rating.count)
      if (prev.rating.count === next.rating.count) {
        expect(prev.rating.average ?? 0).toBeGreaterThanOrEqual(
          next.rating.average ?? 0,
        )
      }
    }
  })

  const ALL_SORTS = [
    "recommended",
    "recent",
    "rating",
    "saves",
    "quick",
  ] as const

  it("같은 요청은 항상 같은 순서다", () => {
    for (const sort of ALL_SORTS) {
      const first = queryMockRecipeList({ sort, limit: 50 }).items.map(
        (i) => i.id,
      )
      const second = queryMockRecipeList({ sort, limit: 50 }).items.map(
        (i) => i.id,
      )
      expect(first).toEqual(second)
    }
  })

  /**
   * 위의 "같은 요청은 같은 순서" 만으로는 tiebreak 을 지킬 수 없다 — 실측: 정렬 함수의
   * `|| a.id - b.id` 를 지워도 59건 전부 통과했다(stable sort 라 소스 순서가 그대로
   * 남는다). tiebreak 은 **정렬 키가 같은 구간에서 id 가 오름차순인가** 로만 확인된다.
   * 모의 행 목록을 일부러 id 역순으로 둔 이유가 이것이다.
   */
  it("정렬 키가 같은 구간에서는 id 오름차순이다 (tiebreak 이 실제로 있다)", () => {
    const keyOf: Record<
      (typeof ALL_SORTS)[number],
      (item: RecipeCard) => string
    > = {
      // 추천·최신은 모의 데이터에 동점이 없다 — 나머지 셋으로 확인한다.
      recommended: (item) => `r${item.id}`,
      recent: (item) => `t${item.id}`,
      rating: (item) => `${item.rating.count}/${item.rating.average ?? "-"}`,
      saves: (item) => String(item.saveCount),
      quick: (item) => String(item.timeMin),
    }

    let tiedGroupsSeen = 0
    for (const sort of ALL_SORTS) {
      const items = queryMockRecipeList({ sort, limit: 50 }).items
      for (let index = 1; index < items.length; index += 1) {
        if (keyOf[sort](items[index - 1]) === keyOf[sort](items[index])) {
          tiedGroupsSeen += 1
          expect(items[index - 1].id).toBeLessThan(items[index].id)
        }
      }
    }
    // 동점이 하나도 없으면 위 루프가 아무것도 검사하지 않는다 — 그건 통과가 아니다.
    expect(tiedGroupsSeen).toBeGreaterThanOrEqual(3)
  })
})

describe("키셋 페이지네이션", () => {
  it("페이지를 이어 받으면 빠짐도 겹침도 없다", () => {
    const all = queryMockRecipeList({ limit: 50, sort: "recent" })
    const collected: number[] = []
    let cursor: string | undefined
    let guard = 0
    do {
      const page = queryMockRecipeList({ limit: 3, cursor, sort: "recent" })
      collected.push(...page.items.map((item) => item.id))
      cursor = page.nextCursor ?? undefined
      guard += 1
      expect(guard).toBeLessThan(20)
    } while (cursor)

    expect(collected).toEqual(all.items.map((item) => item.id))
    expect(new Set(collected).size).toBe(collected.length)
  })

  it("커서를 16진수로 위장해도 처음부터 준다 (Number('0x10') === 16 방어)", () => {
    const injected = queryMockRecipeList({
      cursor: "mock-offset:0x10",
      limit: 3,
    })
    const first = queryMockRecipeList({ limit: 3 })
    expect(injected.items.map((i) => i.id)).toEqual(
      first.items.map((i) => i.id),
    )
  })
})

describe("필터는 한 곳에서만 (계약 §6.1)", () => {
  it("토글·해제·전체해제·개수가 한 모델에서 나온다", () => {
    let selection = EMPTY_RECIPE_FILTERS
    expect(countRecipeFilters(selection)).toBe(0)

    selection = toggleRecipeFilter(selection, "category", "korean")
    selection = toggleRecipeFilter(selection, "nutrition", "low-salt")
    expect(countRecipeFilters(selection)).toBe(2)

    selection = toggleRecipeFilter(selection, "category", "korean")
    expect(countRecipeFilters(selection)).toBe(1)

    selection = removeRecipeFilter(selection, "nutrition", "low-salt")
    expect(countRecipeFilters(selection)).toBe(0)
    expect(countRecipeFilters(clearRecipeFilters())).toBe(0)
  })

  it("적용된 칩 순서는 고른 순서가 아니라 표 순서다 (자리가 안 바뀐다)", () => {
    let selection = EMPTY_RECIPE_FILTERS
    selection = toggleRecipeFilter(selection, "nutrition", "low-phosphorus")
    selection = toggleRecipeFilter(selection, "category", "salad")
    selection = toggleRecipeFilter(selection, "category", "korean")

    expect(
      listAppliedRecipeFilters(selection).map((entry) => entry.optionKey),
    ).toEqual(["korean", "salad", "low-phosphorus"])
  })

  it("서버로는 화면 키가 아니라 저장 표기가 나간다 (계약 §3.1 예시)", () => {
    let selection = EMPTY_RECIPE_FILTERS
    selection = toggleRecipeFilter(selection, "category", "korean")
    selection = toggleRecipeFilter(selection, "nutrition", "low-salt")
    expect(toRecipeListQueryFilters(selection)).toEqual({
      categories: ["한식"],
      tags: ["저염"],
    })
  })

  it("카테고리 필터가 실제로 거른다", () => {
    const korean = queryMockRecipeList({ categories: ["한식"], limit: 50 })
    expect(korean.items.length).toBeGreaterThan(0)
    for (const item of korean.items) expect(item.category).toBe("한식")
  })

  it("태그 두 개는 AND 다 (둘 다 만족하는 것만)", () => {
    const one = queryMockRecipeList({ tags: ["저염"], limit: 50 })
    const two = queryMockRecipeList({ tags: ["저염", "저단백"], limit: 50 })
    expect(one.items.length).toBeGreaterThan(0)
    expect(two.items.length).toBeGreaterThan(0)
    expect(two.items.length).toBeLessThan(one.items.length)
  })
})

describe("계약 §1.2 — 화면 태그에 임상 토큰이 없다", () => {
  const CLINICAL = [
    "저염",
    "저단백",
    "저칼륨",
    "저인",
    "고열량",
    "ckd",
    "CKD",
    "투석",
    "당뇨",
    "고혈압",
    "신장",
    "콩팥",
  ]

  it("목록 카드의 tags 어디에도 임상 토큰이 없다", () => {
    const items = queryMockRecipeList({ limit: 50 }).items
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      for (const tag of item.tags) {
        for (const token of CLINICAL) {
          expect(tag.includes(token)).toBe(false)
        }
      }
    }
  })

  it("그래도 임상 토큰으로 거르는 것은 된다 (질의는 주장이 아니다)", () => {
    expect(
      queryMockRecipeList({ tags: ["저염"], limit: 50 }).items.length,
    ).toBeGreaterThan(0)
  })

  /**
   * 위 테스트는 **모의 데이터**만 본다 — 내가 쓴 데이터라서 통과할 수밖에 없다.
   * 서버가 §1.2 를 한 번 빠뜨리면 앱은 그걸 그대로 그리므로, 카드가 태그를 정하는
   * 지점(`resolveCardTags`)에서도 막는지 확인한다.
   */
  it("서버가 임상 태그를 보내도 카드가 그리지 않는다", () => {
    for (const token of CLINICAL) {
      expect(resolveCardTags([`${token}식`, "채식"]).shown).toEqual(["채식"])
    }
    // 영어 대응어도 막는다.
    expect(resolveCardTags(["Low Sodium", "Vegan"]).shown).toEqual(["Vegan"])
    expect(resolveCardTags(["renal friendly"]).shown).toEqual([])
  })

  it("버린 임상 태그를 +N 으로도 알리지 않는다", () => {
    // `+1` 은 "자리가 없어 못 보여준 게 있다" 는 뜻이다. 임상 태그는 어디서도 안 보여준다.
    expect(resolveCardTags(["저염", "채식"])).toEqual({
      shown: ["채식"],
      overflow: 0,
    })
    expect(resolveCardTags(["저염", "저인", "CKD3"])).toEqual({
      shown: [],
      overflow: 0,
    })
  })
})

describe("계약 §1.1 — provenance 없이 수치를 그리지 않는다", () => {
  it("provenance 가 없으면 nutrition 이 null 이 된다", () => {
    const normalized = normalizeRecipeCard({
      id: 7,
      name: "무명",
      nutrition: { kcal: 100, sodiumMg: 900 },
      rating: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
    })
    expect(normalized).not.toBeNull()
    expect(normalized?.nutrition).toBeNull()
  })

  it("모르는 provenance 도 거부한다", () => {
    const normalized = normalizeRecipeCard({
      id: 7,
      name: "무명",
      nutrition: { sodiumMg: 900, provenance: "vibes" },
    })
    expect(normalized?.nutrition).toBeNull()
  })

  it("계약의 네 값은 통과한다", () => {
    for (const provenance of [
      "reference_estimate",
      "computed_from_ingredients",
      "author_supplied",
      "nutritionist_reviewed",
    ]) {
      const normalized = normalizeRecipeCard({
        id: 7,
        name: "무명",
        nutrition: { sodiumMg: 900, provenance },
      })
      expect(normalized?.nutrition?.provenance).toBe(provenance)
    }
  })

  it("nutrition 이 null 이면 headline 이 와도 카드가 수치를 안 그린다", () => {
    expect(resolveCardHeadline(card({ nutrition: null }))).toBeNull()
    expect(resolveCardHeadline(card())).not.toBeNull()
  })

  it("headline 비율이 0~999 밖이면 비율만 버리고 절대값은 남긴다", () => {
    const normalized = normalizeRecipeCard({
      id: 7,
      name: "무명",
      headline: {
        key: "sodium",
        amount: 900,
        unit: "mg",
        percentOfRemaining: 1200,
      },
    })
    expect(normalized?.headline?.amount).toBe(900)
    expect(normalized?.headline?.percentOfRemaining).toBeNull()
  })

  it("id 나 이름이 없는 카드는 목록에서 빠진다", () => {
    const response = normalizeRecipeListResponse({
      items: [
        { id: 1, name: "있음" },
        { id: null, name: "이름만" },
        { id: 2, name: "   " },
      ],
      hasMore: false,
      budget: {},
    })
    expect(response.items.map((item) => item.id)).toEqual([1])
  })

  it("hasMore 가 true 인데 커서가 없으면 false 로 내린다", () => {
    const response = normalizeRecipeListResponse({
      items: [],
      hasMore: true,
      nextCursor: null,
      budget: {},
    })
    expect(response.hasMore).toBe(false)
  })
})

describe("별점 — 리뷰 0건이면 안 그린다 (시안 ★4.0 (27) 결함)", () => {
  it("개수 0 이면 null", () => {
    expect(
      resolveCardRating({
        average: null,
        count: 0,
        distribution: [0, 0, 0, 0, 0],
      }),
    ).toBeNull()
  })

  it("개수가 있는데 평균이 없으면 그리지 않는다", () => {
    expect(
      resolveCardRating({
        average: null,
        count: 12,
        distribution: [0, 0, 0, 0, 0],
      }),
    ).toBeNull()
  })

  it("정상값은 소수 첫째 자리로 그린다", () => {
    expect(
      resolveCardRating({
        average: 4.66,
        count: 1227,
        distribution: [0, 0, 0, 0, 0],
      }),
    ).toEqual({ average: "4.7", count: 1227 })
  })

  it("서버가 0건에 평균 0.0 을 보내도 0.0 을 만들지 않는다", () => {
    const normalized = normalizeRecipeCard({
      id: 3,
      name: "무명",
      rating: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] },
    })
    expect(normalized?.rating.average).toBeNull()
  })
})

describe("태그 — 최대 2개 + +N, 잘리지 않는다 (시안 #저염ㅅ 결함)", () => {
  it("2개까지만 보이고 나머지는 +N", () => {
    expect(resolveCardTags(["한그릇", "채식", "간단", "도시락"])).toEqual({
      shown: ["한그릇", "채식"],
      overflow: 2,
    })
  })

  it("예산을 넘는 두 번째 태그는 개수가 남아도 +N 으로 넘어간다", () => {
    // 13자 + 2자 = 15자 > 예산 14자. 개수(2)는 남지만 폭이 없다.
    const result = resolveCardTags(["가".repeat(13), "채식"])
    expect(result.shown).toEqual(["가".repeat(13)])
    expect(result.overflow).toBe(1)
  })

  it("혼자서도 예산을 넘는 태그는 아예 그리지 않는다 (잘라 그리지 않는다)", () => {
    const result = resolveCardTags(["가".repeat(15)])
    expect(result.shown).toEqual([])
    expect(result.overflow).toBe(1)
  })

  it("예산에 딱 맞으면 두 개 다 그린다", () => {
    const result = resolveCardTags(["가".repeat(12), "채식"])
    expect(result.shown).toEqual(["가".repeat(12), "채식"])
    expect(result.overflow).toBe(0)
  })

  it("같은 태그가 두 번 오면 한 번만 센다", () => {
    expect(resolveCardTags(["도시락", "도시락"])).toEqual({
      shown: ["도시락"],
      overflow: 0,
    })
  })

  it("빈 태그·공백은 버린다", () => {
    expect(resolveCardTags([" ", "", "채식"])).toEqual({
      shown: ["채식"],
      overflow: 0,
    })
  })
})

describe("수치 표기", () => {
  it("천단위 구분", () => {
    expect(groupThousands(0)).toBe("0")
    expect(groupThousands(27)).toBe("27")
    expect(groupThousands(1227)).toBe("1,227")
    expect(groupThousands(1228)).toBe("1,228")
    expect(groupThousands(1234567)).toBe("1,234,567")
  })

  it("mg 는 정수, g 는 소수 첫째 자리", () => {
    expect(formatNutrientAmount(376, "mg")).toBe("376mg")
    expect(formatNutrientAmount(1567.4, "mg")).toBe("1,567mg")
    expect(formatNutrientAmount(7, "g")).toBe("7g")
    expect(formatNutrientAmount(7.25, "g")).toBe("7.3g")
  })

  it("0분·0인분을 만들지 않는다", () => {
    expect(resolveCardMeta(card({ timeMin: 0, servings: null }))).toEqual({
      timeMin: null,
      servings: null,
    })
    expect(resolveCardMeta(card({ timeMin: 35, servings: 1 }))).toEqual({
      timeMin: 35,
      servings: 1,
    })
  })

  it("추정치가 하나라도 있으면 목록에 한 번 알린다", () => {
    expect(hasEstimatedNutrition([card()])).toBe(true)
    expect(
      hasEstimatedNutrition([
        card({ nutrition: nutrition({ provenance: "nutritionist_reviewed" }) }),
      ]),
    ).toBe(false)
    expect(hasEstimatedNutrition([card({ nutrition: null })])).toBe(false)
  })
})

describe("headline — 가장 빡빡한 영양소 하나 (계약 §3.1)", () => {
  const budget = {
    sodiumMg: 1000,
    potassiumMg: 1000,
    phosphorusMg: 1000,
    proteinG: null,
  }

  it("비율이 가장 큰 것을 고른다", () => {
    const picked = pickHeadline(
      nutrition({ sodiumMg: 100, potassiumMg: 500, phosphorusMg: 200 }),
      budget,
    )
    expect(picked.key).toBe("potassium")
    expect(picked.percentOfRemaining).toBe(50)
  })

  it("체중 기록이 없어 단백질 한도를 모르면 단백질은 고르지 않는다", () => {
    const picked = pickHeadline(
      nutrition({
        proteinG: 900,
        sodiumMg: 10,
        potassiumMg: 10,
        phosphorusMg: 10,
      }),
      budget,
    )
    expect(picked.key).not.toBe("protein")
  })

  it("남은 양이 0 이하면 비율 없이 절대값만 준다", () => {
    const picked = pickHeadline(nutrition({ sodiumMg: 376 }), {
      sodiumMg: 0,
      potassiumMg: 0,
      phosphorusMg: 0,
      proteinG: null,
    })
    expect(picked.percentOfRemaining).toBeNull()
    expect(picked.amount).toBe(376)
  })

  it("비율은 999 를 넘지 않는다", () => {
    const picked = pickHeadline(nutrition({ sodiumMg: 999999 }), budget)
    expect(picked.percentOfRemaining).toBe(999)
  })

  it("모의 목록의 모든 카드가 headline 을 갖는다", () => {
    for (const item of queryMockRecipeList({ limit: 50 }).items) {
      expect(item.headline).not.toBeNull()
      expect(item.nutrition).not.toBeNull()
    }
  })
})

describe("결과 수를 먼저 보여준다 (계약 §6.1)", () => {
  it("서버가 전체 개수를 주면 그대로 말한다", () => {
    expect(resolveResultCount(32, 20, true)).toEqual({
      kind: "exact",
      count: 32,
    })
  })

  it("전체 개수를 모르고 더 남았으면 '이상' 으로 내려간다 (20 을 32 인 척하지 않는다)", () => {
    expect(resolveResultCount(null, 20, true)).toEqual({
      kind: "atLeast",
      count: 20,
    })
  })

  it("전체 개수를 몰라도 더 없으면 받은 게 전부다", () => {
    expect(resolveResultCount(undefined, 7, false)).toEqual({
      kind: "exhausted",
      count: 7,
    })
  })

  it("0 도 정확한 값으로 취급한다", () => {
    expect(resolveResultCount(0, 0, false)).toEqual({ kind: "exact", count: 0 })
  })
})

describe("자동완성 표시 조건", () => {
  it("포커스 + 입력이 있어야 띄운다", () => {
    expect(
      shouldShowSuggestions({
        isFocused: true,
        draft: "밥",
        committedQuery: "",
      }),
    ).toBe(true)
    expect(
      shouldShowSuggestions({
        isFocused: false,
        draft: "밥",
        committedQuery: "",
      }),
    ).toBe(false)
    expect(
      shouldShowSuggestions({
        isFocused: true,
        draft: "  ",
        committedQuery: "",
      }),
    ).toBe(false)
  })

  it("확정된 검색어와 같으면 안 띄운다 (결과 위에 같은 제안을 겹치지 않는다)", () => {
    expect(
      shouldShowSuggestions({
        isFocused: true,
        draft: "밥",
        committedQuery: "밥",
      }),
    ).toBe(false)
  })
})

describe("작성 플로팅 접힘 (계약 §6.1)", () => {
  /**
   * `offsetY: 0, lastOffsetY: 400` 만으로는 이 규칙을 지킬 수 없다 — 실측: 맨 위
   * 가드를 지워도 그 경우는 "위로 스크롤" 로 읽혀 false 가 나오고 테스트가 통과했다.
   * 방향이 결정하지 않는 경우(움직임이 임계값 안)여야 가드만이 답을 낼 수 있다.
   */
  it("맨 위에서는 방향과 무관하게 펼친다", () => {
    expect(
      nextFabCollapsed({ collapsed: true, offsetY: 0, lastOffsetY: 400 }),
    ).toBe(false)
    // 이미 접힌 채로 맨 위에 멈춰 있다 — 방향 변화가 없으니 가드 없이는 접힌 채 남는다.
    expect(
      nextFabCollapsed({ collapsed: true, offsetY: 0, lastOffsetY: 0 }),
    ).toBe(false)
    // 맨 위에서 살짝 내렸다(임계값 안) — 가드 없이는 현재 상태(접힘)가 유지된다.
    expect(
      nextFabCollapsed({ collapsed: true, offsetY: 4, lastOffsetY: 0 }),
    ).toBe(false)
  })

  it("내리면 접고 올리면 펼친다", () => {
    expect(
      nextFabCollapsed({ collapsed: false, offsetY: 200, lastOffsetY: 100 }),
    ).toBe(true)
    expect(
      nextFabCollapsed({ collapsed: true, offsetY: 100, lastOffsetY: 200 }),
    ).toBe(false)
  })

  it("임계값 안의 흔들림은 상태를 바꾸지 않는다", () => {
    expect(
      nextFabCollapsed({ collapsed: true, offsetY: 210, lastOffsetY: 200 }),
    ).toBe(true)
    expect(
      nextFabCollapsed({ collapsed: false, offsetY: 210, lastOffsetY: 200 }),
    ).toBe(false)
  })
})

describe("자동완성 응답 정규화 (계약에 타입이 없다)", () => {
  it("문자열 배열도 받는다", () => {
    expect(normalizeSuggestions({ items: ["곤드레밥", "잡채덮밥"] })).toEqual([
      { text: "곤드레밥", recipeId: null, kind: "keyword" },
      { text: "잡채덮밥", recipeId: null, kind: "keyword" },
    ])
  })

  it("객체 배열도 받고 recipeId 가 있으면 recipe 로 본다", () => {
    expect(
      normalizeSuggestions({
        items: [
          { text: "곤드레밥", recipeId: 101 },
          { name: "밥", recipeId: null },
        ],
      }),
    ).toEqual([
      { text: "곤드레밥", recipeId: 101, kind: "recipe" },
      { text: "밥", recipeId: null, kind: "keyword" },
    ])
  })

  it("맨 배열, 중복, 빈 문자열을 견딘다", () => {
    expect(normalizeSuggestions(["밥", "밥", "", "  ", "국"])).toEqual([
      { text: "밥", recipeId: null, kind: "keyword" },
      { text: "국", recipeId: null, kind: "keyword" },
    ])
    expect(normalizeSuggestions(null)).toEqual([])
    expect(normalizeSuggestions({})).toEqual([])
  })
})

describe("i18n — 하드코딩 문자열 대신 키가 있다", () => {
  const KEYS = [
    "resultCountAtLeast",
    "suggestTitle",
    "suggestKeyword",
    "suggestEmpty",
    "filterOpen",
    "filterApplied",
    "filterClearAll",
    "filterRemove",
    "sortAccessibility",
    "saveCount",
    "ratingValue",
    "ratingCount",
    "headline",
    "headlineRemaining",
    "tagOverflow",
    "authored",
    "unmatchedNotice",
    "cardAccessibility",
    "emptyTitle",
    "emptyBody",
    "errorTitle",
    "errorBody",
    "retry",
  ]

  it("ko/en 양쪽에 목록 화면 키가 다 있다", () => {
    for (const key of KEYS) {
      expect(typeof (koRecipe.list as Record<string, unknown>)[key]).toBe(
        "string",
      )
      expect(typeof (enRecipe.list as Record<string, unknown>)[key]).toBe(
        "string",
      )
    }
    for (const sort of ["recommended", "recent", "rating", "saves", "quick"]) {
      expect(typeof (koRecipe.list.sort as Record<string, unknown>)[sort]).toBe(
        "string",
      )
      expect(typeof (enRecipe.list.sort as Record<string, unknown>)[sort]).toBe(
        "string",
      )
    }
  })
})

describe("모의 플래그 — 서버를 붙일 때 끄는 스위치", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("지금은 모의 경로가 켜져 있고 네트워크를 타지 않는다", async () => {
    expect(RECIPE_LIST_V2_MOCK).toBe(true)
    const page = await recipeListV2Service.getRecipeList({ limit: 3 })
    expect(page.items).toHaveLength(3)
    expect(page.budget.sodiumMg).toBeGreaterThan(0)
    expect(apiGet).not.toHaveBeenCalled()

    const suggestions = await recipeListV2Service.getSuggestions("밥")
    expect(suggestions.length).toBeGreaterThan(0)
    expect(apiGet).not.toHaveBeenCalled()
  })

  it("플래그를 끄면 계약 §3.1 쿼리로 실제 엔드포인트를 부른다", async () => {
    const previous = process.env.EXPO_PUBLIC_RECIPE_V2_MOCK
    process.env.EXPO_PUBLIC_RECIPE_V2_MOCK = "false"
    jest.resetModules()
    apiGet.mockResolvedValue({
      data: { result: { items: [], hasMore: false, budget: {} } },
    })

    const reloaded =
      await import("../src/features/recipe/services/recipeListV2Service")
    expect(reloaded.RECIPE_LIST_V2_MOCK).toBe(false)

    await reloaded.recipeListV2Service.getRecipeList({
      limit: 3,
      cursor: "c1",
      q: "밥",
      categories: ["한식", "일식"],
      tags: ["저염"],
      sort: "quick",
    })
    expect(apiGet).toHaveBeenCalledWith("/recipes", {
      params: {
        limit: 3,
        cursor: "c1",
        q: "밥",
        categories: "한식,일식",
        tags: "저염",
        sort: "quick",
      },
    })

    apiGet.mockResolvedValue({ data: { result: { items: ["밥"] } } })
    await reloaded.recipeListV2Service.getSuggestions("밥", 5)
    expect(apiGet).toHaveBeenLastCalledWith("/recipes/search/suggest", {
      params: { q: "밥", limit: 5 },
    })

    // 빈 검색어는 서버를 부르지 않는다.
    apiGet.mockClear()
    expect(await reloaded.recipeListV2Service.getSuggestions("   ")).toEqual([])
    expect(apiGet).not.toHaveBeenCalled()

    process.env.EXPO_PUBLIC_RECIPE_V2_MOCK = previous
    jest.resetModules()
  })
})

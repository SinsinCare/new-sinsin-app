/* eslint-disable import/first --
 * apiClient 는 실제 axios 인스턴스를 만든다(모듈 로드 시 env 읽음). 서비스의 모의
 * 경로만 검증하므로 다른 서비스 테스트와 같은 방식으로 먼저 막는다. */
jest.mock("../src/services/core/apiClient", () => ({
  api: {},
}))

import enRecipe from "../src/i18n/locales/en/recipe.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import i18n from "../src/i18n"

import {
  __resetArchiveMockState,
  buildArchiveQueryParams,
  flattenArchivePages,
  nextSaveCount,
  paginateArchive,
  patchSavedStateInPages,
  recipeArchiveService,
} from "../src/features/recipe/archive/recipeArchiveService"
import {
  ARCHIVE_QUERY_ROOT,
  archiveSourceQueryKey,
} from "../src/features/recipe/archive/useRecipeArchiveList"
import {
  EMPTY_RECIPE_FILTERS,
  toggleRecipeFilter,
} from "../src/features/recipe/components/list/recipeListFilterModel"
import type {
  NutrientBudget,
  RecipeCard,
  RecipeListResponse,
} from "../src/features/recipe/types/recipeListV2"

const BUDGET: NutrientBudget = {
  sodiumMg: 1500,
  potassiumMg: 3000,
  phosphorusMg: 900,
  proteinG: null,
}

function card(id: number, saved: boolean, saveCount: number): RecipeCard {
  return {
    id,
    name: `레시피 ${id}`,
    summary: null,
    category: "한식",
    difficulty: null,
    timeMin: 30,
    servings: 1,
    thumbnailUrl: null,
    tags: [],
    nutrition: {
      kcal: 100,
      proteinG: 1,
      sodiumMg: 2,
      potassiumMg: 3,
      phosphorusMg: 4,
      provenance: "reference_estimate",
      unmatchedIngredients: [],
    },
    headline: null,
    rating: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
    saveCount,
    saved,
    authored: false,
  }
}

function page(items: RecipeCard[], hasMore = false): RecipeListResponse {
  return {
    items,
    nextCursor: hasMore ? "archive:1" : null,
    hasMore,
    budget: BUDGET,
    totalCount: items.length,
  }
}

describe("저장 낙관 갱신 — PUT 절대 상태 (계약 §2.1)", () => {
  it("상태가 바뀔 때만 저장 수를 센다 — 같은 값이 두 번 와도 두 번 세지 않는다", () => {
    expect(nextSaveCount(10, true, false)).toBe(9)
    expect(nextSaveCount(10, false, true)).toBe(11)
    // 멱등: 이미 그 상태면 그대로. 토글이었을 때 연타로 어긋난 자리다.
    expect(nextSaveCount(10, true, true)).toBe(10)
    expect(nextSaveCount(10, false, false)).toBe(10)
  })

  it("저장 수가 음수로 내려가지 않는다", () => {
    expect(nextSaveCount(0, true, false)).toBe(0)
  })

  it("저장을 풀어도 행을 목록에서 지우지 않는다 (되돌릴 수 있어야 한다)", () => {
    const pages = [page([card(1, true, 5), card(2, true, 7)])]
    const patched = patchSavedStateInPages(pages, 1, false)

    expect(patched[0].items).toHaveLength(2)
    expect(patched[0].items[0]).toMatchObject({
      id: 1,
      saved: false,
      saveCount: 4,
    })
    // 다른 행은 손대지 않는다.
    expect(patched[0].items[1]).toMatchObject({
      id: 2,
      saved: true,
      saveCount: 7,
    })
  })

  it("같은 절대 상태를 두 번 적용해도 결과가 같다 (재시도·연타 안전)", () => {
    const pages = [page([card(1, true, 5)])]
    const once = patchSavedStateInPages(pages, 1, false)
    const twice = patchSavedStateInPages(once, 1, false)
    expect(twice[0].items[0].saveCount).toBe(4)
    expect(twice[0].items[0].saved).toBe(false)
  })

  it("서버가 준 saveCount 가 낙관 추정을 이긴다", () => {
    const pages = [page([card(1, true, 5)])]
    const patched = patchSavedStateInPages(pages, 1, false, 1227)
    expect(patched[0].items[0].saveCount).toBe(1227)
  })

  it("그 레시피가 없는 페이지는 같은 객체를 그대로 돌려준다 (불필요한 리렌더 방지)", () => {
    const untouched = page([card(9, true, 1)])
    const target = page([card(1, true, 1)])
    const patched = patchSavedStateInPages([untouched, target], 1, false)
    expect(patched[0]).toBe(untouched)
    expect(patched[1]).not.toBe(target)
  })

  it("여러 페이지에 흩어져 있어도 해당 레시피만 바뀐다", () => {
    const pages = [page([card(1, true, 3)], true), page([card(2, true, 4)])]
    const patched = patchSavedStateInPages(pages, 2, false)
    expect(patched[0].items[0].saved).toBe(true)
    expect(patched[1].items[0]).toMatchObject({ saved: false, saveCount: 3 })
  })

  it("페이지를 순서대로 편다", () => {
    const pages = [page([card(1, true, 1)], true), page([card(2, true, 1)])]
    expect(flattenArchivePages(pages).map((item) => item.id)).toEqual([1, 2])
  })
})

/**
 * 저장 목록에 **없던** 레시피를 저장했을 때 보관함이 갱신되는가.
 *
 * 실측된 결함이다. "최근 본 기록" 에서 저장을 누르면 서버는 `saved:true`·`saveCount:1`
 * 로 받았는데("저장 해제" 라벨과 "저장 1" 이 화면에 나타났다) "저장한 레시피" 탭은 계속
 * **"저장한 레시피가 없어요"** 였다.
 *
 * 원인: 낙관 갱신이 `patchSavedStateInPages` 뿐이고, 그 함수는 **이미 캐시에 있는 행의
 * 플래그만** 바꾼다. 저장 목록 캐시에는 그 행이 애초에 없으므로 고칠 대상이 없다.
 * 아래 첫 테스트가 그 성질을 못 박고, 나머지가 고침(반대쪽 출처 무효화)을 못 박는다.
 */
describe("저장 목록에 없던 행을 저장할 때", () => {
  const card = (id: number, saved: boolean): RecipeCard =>
    ({
      id,
      name: `r${id}`,
      summary: null,
      category: "한식",
      difficulty: null,
      timeMin: null,
      servings: null,
      thumbnailUrl: null,
      tags: [],
      nutrition: null,
      headline: null,
      rating: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
      saveCount: 0,
      saved,
      authored: false,
    }) as unknown as RecipeCard

  const page = (cards: RecipeCard[]): RecipeListResponse =>
    ({
      items: cards,
      nextCursor: null,
      hasMore: false,
      budget: null as unknown as NutrientBudget,
    }) as unknown as RecipeListResponse

  it("패치만으로는 행이 생기지 않는다 — 이것이 결함의 원인이다", () => {
    // 저장 목록 캐시가 비어 있는 상태. 40번을 저장해도 넣을 자리가 없다.
    const emptySaved = [page([])]
    const patched = patchSavedStateInPages(emptySaved, 40, true, 1)
    expect(patched[0]!.items).toHaveLength(0)
  })

  it("반대쪽 출처의 캐시 키를 접두어로 집을 수 있다", () => {
    // 고침은 "반대쪽 출처만 무효화" 다. 그 키가 실제 쿼리 키의 접두어여야 동작한다.
    const savedKey = archiveSourceQueryKey("saved")
    expect(savedKey).toEqual([...ARCHIVE_QUERY_ROOT, "saved"])
    // 실제 쿼리 키는 뒤에 language·q·filter 가 붙는다. 접두어가 맞아야 잡힌다.
    const actualQueryKey = [...ARCHIVE_QUERY_ROOT, "saved", "ko", "", "", ""]
    expect(actualQueryKey.slice(0, savedKey.length)).toEqual([...savedKey])
  })

  it("두 출처의 키가 서로 다르다 — 한쪽만 무효화할 수 있다", () => {
    // 같으면 "현재 보는 목록은 건드리지 않는다" 를 지킬 수 없다(저장 해제한 행이
    // 손가락 아래에서 사라진다).
    expect(archiveSourceQueryKey("saved")).not.toEqual(
      archiveSourceQueryKey("recent"),
    )
  })

  it("최근 본 목록의 행은 패치로 고쳐진다 — 그쪽은 무효화가 필요 없다", () => {
    const recent = [page([card(40, false)])]
    const patched = patchSavedStateInPages(recent, 40, true, 1)
    expect(patched[0]!.items[0]!.saved).toBe(true)
    expect(patched[0]!.items[0]!.saveCount).toBe(1)
  })
})

describe("쿼리 파라미터 (계약 §3.1 이름)", () => {
  it("검색어는 `q` 로 나간다 — v1 의 `search` 가 아니다", () => {
    expect(buildArchiveQueryParams({ q: "곤드레" })).toMatchObject({
      q: "곤드레",
    })
    expect(buildArchiveQueryParams({ q: "곤드레" })).not.toHaveProperty(
      "search",
    )
  })

  it("빈 검색어·공백만 있는 검색어는 파라미터를 만들지 않는다", () => {
    expect(buildArchiveQueryParams({ q: "   " })).not.toHaveProperty("q")
    expect(buildArchiveQueryParams({})).not.toHaveProperty("q")
  })

  it("limit 기본값이 붙고 cursor 는 있을 때만 붙는다", () => {
    expect(buildArchiveQueryParams({})).toEqual({ limit: 20 })
    expect(buildArchiveQueryParams({ cursor: "archive:20" })).toMatchObject({
      cursor: "archive:20",
    })
  })

  it("필터는 화면 키가 아니라 저장 표기로 나간다 (목록과 같은 표를 쓴다)", () => {
    let filter = toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "category", "korean")
    filter = toggleRecipeFilter(filter, "category", "salad")
    filter = toggleRecipeFilter(filter, "nutrition", "low-salt")

    const params = buildArchiveQueryParams({ filter })
    expect(params.categories).toBe("한식,샐러드")
    expect(params.tags).toBe("저염")
  })

  it("고른 필터가 없으면 categories/tags 를 아예 보내지 않는다", () => {
    const params = buildArchiveQueryParams({ filter: EMPTY_RECIPE_FILTERS })
    expect(params).not.toHaveProperty("categories")
    expect(params).not.toHaveProperty("tags")
  })
})

describe("커서 페이지네이션", () => {
  const items = Array.from({ length: 5 }, (_, index) =>
    card(index + 1, true, 1),
  )

  it("커서를 이어 붙이면 모든 항목을 한 번씩만 준다", () => {
    const first = paginateArchive(items, undefined, 2, BUDGET)
    expect(first.items.map((item) => item.id)).toEqual([1, 2])
    expect(first.hasMore).toBe(true)

    const second = paginateArchive(
      items,
      first.nextCursor ?? undefined,
      2,
      BUDGET,
    )
    expect(second.items.map((item) => item.id)).toEqual([3, 4])

    const third = paginateArchive(
      items,
      second.nextCursor ?? undefined,
      2,
      BUDGET,
    )
    expect(third.items.map((item) => item.id)).toEqual([5])
    expect(third.hasMore).toBe(false)
    expect(third.nextCursor).toBeNull()
  })

  it('16진수처럼 보이는 커서를 숫자로 읽지 않는다 (Number("0x10") === 16)', () => {
    const hex = paginateArchive(items, "archive:0x10", 2, BUDGET)
    expect(hex.items.map((item) => item.id)).toEqual([1, 2])
  })

  it("다른 화면의 커서 접두어는 처음부터로 떨어진다", () => {
    const foreign = paginateArchive(items, "list:2", 2, BUDGET)
    expect(foreign.items.map((item) => item.id)).toEqual([1, 2])
  })
})

describe("모의 서비스 (서버 붙기 전 경로)", () => {
  beforeEach(() => {
    __resetArchiveMockState()
  })

  it("저장 목록은 저장한 것만 준다", async () => {
    const response = await recipeArchiveService.getSavedRecipes({})
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.every((item) => item.saved)).toBe(true)
    // 계약 §1.1: provenance 없이 수치를 그리지 않는다 — 정규화가 통과한 카드만 온다.
    expect(
      response.items.every(
        (item) => item.nutrition == null || item.nutrition.provenance != null,
      ),
    ).toBe(true)
  })

  it("최근 본 목록은 같은 레시피를 두 번 주지 않는다 (서버가 레시피당 한 행)", async () => {
    const response = await recipeArchiveService.getRecentRecipes({})
    const ids = response.items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("저장을 풀면 다시 조회했을 때 되살아나지 않는다", async () => {
    const before = await recipeArchiveService.getSavedRecipes({})
    const target = before.items[0]

    const result = await recipeArchiveService.setRecipeSaved(target.id, false)
    expect(result.saved).toBe(false)

    const after = await recipeArchiveService.getSavedRecipes({})
    expect(after.items.map((item) => item.id)).not.toContain(target.id)

    // 최근 본 기록에는 남아 있고, 저장 상태만 꺼져 있다.
    const recent = await recipeArchiveService.getRecentRecipes({})
    const stillThere = recent.items.find((item) => item.id === target.id)
    expect(stillThere?.saved).toBe(false)
  })

  it("같은 절대 상태를 두 번 보내도 저장 수가 두 번 움직이지 않는다", async () => {
    const before = await recipeArchiveService.getSavedRecipes({})
    const target = before.items[0]
    const first = await recipeArchiveService.setRecipeSaved(target.id, false)
    const second = await recipeArchiveService.setRecipeSaved(target.id, false)
    expect(second.saveCount).toBe(first.saveCount)
  })

  it("검색어가 결과를 실제로 바꾼다 (시안의 결함: 입력해도 목록이 그대로)", async () => {
    const all = await recipeArchiveService.getRecentRecipes({})
    const name = all.items[0].name
    const hit = await recipeArchiveService.getRecentRecipes({ q: name })
    expect(hit.items.length).toBeGreaterThan(0)
    expect(hit.items.length).toBeLessThanOrEqual(all.items.length)

    const miss = await recipeArchiveService.getRecentRecipes({
      q: "절대없는레시피이름ZZZ",
    })
    expect(miss.items).toHaveLength(0)
    expect(miss.hasMore).toBe(false)
  })

  it("필터가 결과를 좁힌다", async () => {
    const all = await recipeArchiveService.getRecentRecipes({})
    const filter = toggleRecipeFilter(
      EMPTY_RECIPE_FILTERS,
      "category",
      "korean",
    )
    const narrowed = await recipeArchiveService.getRecentRecipes({ filter })
    expect(narrowed.items.length).toBeLessThanOrEqual(all.items.length)
    expect(narrowed.items.every((item) => item.category === "한식")).toBe(true)
  })
})

describe("보관함 문구 (i18n)", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("두 탭 이름과 빈 상태 문구가 두 언어에 있다", async () => {
    expect(i18n.t("archive.tabSaved", { ns: "recipe" })).toBe("저장한 레시피")
    expect(i18n.t("archive.savedEmptyTitle", { ns: "recipe" })).toBe(
      "저장한 레시피가 없어요",
    )
    await i18n.changeLanguage("en")
    expect(i18n.t("archive.tabSaved", { ns: "recipe" })).toBe("Saved")
    expect(i18n.t("archive.savedEmptyTitle", { ns: "recipe" })).toBe(
      "Nothing saved yet",
    )
  })

  it("provenance 4종 모두 배지와 설명 본문이 있다 (계약 §1.1)", () => {
    // 상세 담당이 `detail.nutrition.*` 아래에 실었다. 같은 뜻의 표를 두 벌 두지
    // 않았으므로(보고 참고) 여기서 그 표의 완전성을 검사한다 — 네 값 중 하나라도
    // 빠지면 앱이 provenance 를 못 그리고, 그러면 수치 자체를 그릴 수 없다.
    const provenances = [
      "reference_estimate",
      "computed_from_ingredients",
      "author_supplied",
      "nutritionist_reviewed",
    ] as const
    for (const key of provenances) {
      expect(koRecipe.detail.nutrition.badge[key]).toBeTruthy()
      expect(koRecipe.detail.nutrition.explain[key]).toBeTruthy()
      expect(enRecipe.detail.nutrition.badge[key]).toBeTruthy()
      expect(enRecipe.detail.nutrition.explain[key]).toBeTruthy()
    }
  })

  it("영양 4항목 이름이 두 언어에 있다", () => {
    // 목록 카드·상세가 `curated.*` 를 쓴다(`RecipeListCard.NUTRIENT_LABEL_KEYS`).
    for (const key of [
      "sodium",
      "potassium",
      "phosphorus",
      "protein",
    ] as const) {
      expect(koRecipe.curated[key]).toBeTruthy()
      expect(enRecipe.curated[key]).toBeTruthy()
    }
  })

  it("영어 레시피 문구 전체에 안전·적합성을 주장하는 낱말이 없다 (계약 §1.1)", () => {
    // 검수 전 카탈로그에 "safe"/"kidney-friendly"/"approved" 를 붙이면 그 자체가
    // 임상 주장이다. 네임스페이스 전체를 본다 — 문구를 넣는 사람이 넷이라 한 그룹만
    // 검사하면 다음 사람이 다른 그룹에 넣는다.
    const banned =
      /\b(safe|safely|safety|kidney-friendly|kidney friendly|approved|suitable for you|good for your kidneys)\b/i
    const offenders: string[] = []

    const walk = (value: unknown, path: string) => {
      if (typeof value === "string") {
        if (banned.test(value)) offenders.push(`${path} → ${value}`)
        return
      }
      if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          walk(child, path ? `${path}.${key}` : key)
        }
      }
    }

    walk(enRecipe, "")
    expect(offenders).toEqual([])
  })

  it("남은 양 비율과 체중 안내 문구가 두 언어에 있다", () => {
    expect(koRecipe.list.headlineRemaining).toContain("{{percent}}")
    expect(enRecipe.list.headlineRemaining).toContain("{{percent}}")
    expect(koRecipe.detail.nutrition.proteinNoWeight).toBeTruthy()
    expect(enRecipe.detail.nutrition.proteinNoWeight).toBeTruthy()
  })

  it("저장 해제 뒤 되돌리는 라벨이 두 언어에 있다 (계약 §6.4 되돌리기)", async () => {
    expect(i18n.t("archive.unsaveAction", { ns: "recipe" })).toBe("저장 해제")
    expect(i18n.t("archive.resaveAction", { ns: "recipe" })).toBe("다시 저장")
    await i18n.changeLanguage("en")
    expect(i18n.t("archive.resaveAction", { ns: "recipe" })).toBe("Save again")
  })
})

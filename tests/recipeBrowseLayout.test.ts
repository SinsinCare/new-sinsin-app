/**
 * "필터가 3곳에 흩어져 있다" 회귀 검사 — **시안의 원래 결함**이다.
 *
 * 시안은 같은 카테고리 필터를 세 군데(상단 칩 · 카테고리 아이콘 캐러셀 · 필터 시트)에서
 * 조작했고, 그래서 무엇이 적용 중인지 화면만 보고 알 수 없었다. v2 는 자리를 하나로
 * 못 박았다: **캐러셀이 보이는 동안 카테고리는 캐러셀에서만, 캐러셀이 감춰지면 칩에서만.**
 *
 * 두 가지가 다 사고다.
 *  - **0곳** = 걸어 둔 필터를 볼 수도 뺄 수도 없다. 결과가 왜 줄었는지 알 수 없고
 *    되돌릴 방법이 없다. 최악이다.
 *  - **2곳** = 같은 필터가 한 화면에 두 번. 어느 쪽이 진짜인지 알 수 없고, 한쪽에서만
 *    빼면 다른 쪽이 남은 것처럼 보인다.
 *
 * 그래서 조합 **전부**에 대해 "정확히 한 곳" 을 검사한다.
 */
import fs from "node:fs"
import path from "node:path"

import {
  categoryFilterAffordances,
  resolveRecipeBrowseLayout,
  visibleAppliedRecipeFilters,
} from "../src/features/recipe/components/list/recipeHomePresentation"
import {
  countRecipeFilters,
  EMPTY_RECIPE_FILTERS,
  listAppliedRecipeFilters,
  toggleRecipeFilter,
  type RecipeFilterSelection,
} from "../src/features/recipe/components/list/recipeListFilterModel"

/** 화면이 하는 것과 같은 조립. 여기서 순서를 바꾸면 검사가 화면과 달라진다. */
function screenState(selection: RecipeFilterSelection, isSearching: boolean) {
  const applied = listAppliedRecipeFilters(selection)
  const layout = resolveRecipeBrowseLayout({
    isSearching,
    appliedFilterCount: countRecipeFilters(selection),
  })
  return {
    applied,
    layout,
    visible: visibleAppliedRecipeFilters(applied, layout),
    affordances: categoryFilterAffordances({ selection, applied, layout }),
  }
}

const SELECTIONS: [string, RecipeFilterSelection][] = [
  ["아무것도 없음", EMPTY_RECIPE_FILTERS],
  [
    "카테고리 1개",
    toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "category", "korean"),
  ],
  [
    "카테고리 2개",
    toggleRecipeFilter(
      toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "category", "korean"),
      "category",
      "salad",
    ),
  ],
  [
    "영양 1개",
    toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "nutrition", "low-salt"),
  ],
  [
    "카테고리 + 영양",
    toggleRecipeFilter(
      toggleRecipeFilter(EMPTY_RECIPE_FILTERS, "category", "korean"),
      "nutrition",
      "low-salt",
    ),
  ],
]

describe("섹션·캐러셀을 언제 그리는가", () => {
  it("아무 것도 안 걸렸으면 둘 다 보인다", () => {
    expect(
      resolveRecipeBrowseLayout({ isSearching: false, appliedFilterCount: 0 }),
    ).toEqual({ showCategoryCarousel: true, showMealSections: true })
  })

  it("검색 중에는 캐러셀과 섹션이 **둘 다** 감춰진다", () => {
    for (const count of [0, 1, 3]) {
      expect(
        resolveRecipeBrowseLayout({
          isSearching: true,
          appliedFilterCount: count,
        }),
      ).toEqual({ showCategoryCarousel: false, showMealSections: false })
    }
  })

  it("필터가 걸리면 섹션만 감춰지고 캐러셀은 남는다", () => {
    // 섹션을 감추는 근거는 서버다 — `GET /recipes/home` 은 `locale` 하나만 받아
    // 섹션을 그 카테고리로 좁힐 수 없다. 좁히지 못한 섹션을 좁혀진 목록 위에 남기면
    // "한식" 을 눌렀는데 위쪽 카드는 중식·양식인 화면이 된다.
    // 캐러셀을 남기는 근거는 사용자다 — 자기가 무엇을 눌렀는지 보고 다시 뺄 수 있어야 한다.
    expect(
      resolveRecipeBrowseLayout({ isSearching: false, appliedFilterCount: 1 }),
    ).toEqual({ showCategoryCarousel: true, showMealSections: false })
  })

  it("섹션이 보이는 경우는 '검색 안 함 + 필터 0개' 하나뿐이다", () => {
    for (const isSearching of [true, false]) {
      for (const appliedFilterCount of [0, 1, 2, 5]) {
        const layout = resolveRecipeBrowseLayout({
          isSearching,
          appliedFilterCount,
        })
        expect(layout.showMealSections).toBe(
          !isSearching && appliedFilterCount === 0,
        )
      }
    }
  })
})

describe("카테고리 필터가 드러나는 자리는 정확히 하나다", () => {
  for (const [label, selection] of SELECTIONS) {
    for (const isSearching of [false, true]) {
      const hasCategory = (selection.category?.length ?? 0) > 0
      const title = `${label} / ${isSearching ? "검색 중" : "둘러보기"}`

      it(`${title} — ${hasCategory ? "정확히 한 곳에서 보이고 뺄 수 있다" : "드러낼 카테고리가 없다"}`, () => {
        const { affordances } = screenState(selection, isSearching)
        expect(affordances).toHaveLength(hasCategory ? 1 : 0)
      })
    }
  }

  it("캐러셀이 보이는 동안 카테고리 칩은 나오지 않는다 (중복 금지)", () => {
    const selection = toggleRecipeFilter(
      EMPTY_RECIPE_FILTERS,
      "category",
      "korean",
    )
    const { layout, visible, affordances } = screenState(selection, false)
    expect(layout.showCategoryCarousel).toBe(true)
    expect(visible.some((entry) => entry.group === "category")).toBe(false)
    expect(affordances).toEqual(["carousel"])
  })

  it("캐러셀이 감춰지면(검색 중) 카테고리가 칩으로 나온다 (사라지지 않는다)", () => {
    const selection = toggleRecipeFilter(
      EMPTY_RECIPE_FILTERS,
      "category",
      "korean",
    )
    const { layout, visible, affordances } = screenState(selection, true)
    expect(layout.showCategoryCarousel).toBe(false)
    expect(visible.map((entry) => entry.optionKey)).toEqual(["korean"])
    expect(affordances).toEqual(["chip"])
  })

  it("영양 필터는 캐러셀에 자리가 없으므로 **항상** 칩으로 나온다", () => {
    for (const isSearching of [false, true]) {
      const selection = toggleRecipeFilter(
        EMPTY_RECIPE_FILTERS,
        "nutrition",
        "low-salt",
      )
      const { visible } = screenState(selection, isSearching)
      expect(visible.map((entry) => entry.optionKey)).toEqual(["low-salt"])
    }
  })

  it("카테고리를 걸어도 영양 칩은 그대로 보인다 — 칩 줄이 통째로 사라지지 않는다", () => {
    const selection = SELECTIONS[4][1] // 카테고리 + 영양
    const { visible } = screenState(selection, false)
    expect(visible.map((entry) => entry.group)).toEqual(["nutrition"])
  })

  it("걸린 필터는 어떤 조합에서도 최소 한 곳에서 보인다", () => {
    for (const [, selection] of SELECTIONS) {
      for (const isSearching of [false, true]) {
        const { applied, visible, affordances } = screenState(
          selection,
          isSearching,
        )
        for (const entry of applied) {
          const reachable =
            visible.includes(entry) ||
            (entry.group === "category" && affordances.length > 0)
          expect(reachable).toBe(true)
        }
      }
    }
  })

  it("visibleAppliedRecipeFilters 가 모델 배열을 바꾸지 않는다", () => {
    const applied = listAppliedRecipeFilters(SELECTIONS[4][1])
    const before = [...applied]
    visibleAppliedRecipeFilters(applied, { showCategoryCarousel: true })
    expect(applied).toEqual(before)
  })
})

describe("화면이 이 판정을 실제로 쓴다", () => {
  /**
   * 판정을 순수 모듈에 두어도 화면이 안 쓰면 아무 의미가 없다. 화면은 tamagui·
   * expo-router 를 끌고 와 렌더 테스트가 불가능하므로 소스로 못 박는다.
   */
  const screen = fs.readFileSync(
    path.join(__dirname, "..", "app", "(tabs)", "recipe.tsx"),
    "utf8",
  )

  it("층 판정을 `resolveRecipeBrowseLayout` 에서 받는다", () => {
    expect(screen).toContain("resolveRecipeBrowseLayout({")
    expect(screen).toContain(
      "visibleAppliedRecipeFilters(applied, browseLayout)",
    )
  })

  it("화면 안에서 조건을 다시 적지 않는다 (두 진실을 만들지 않는다)", () => {
    // 예전 코드: `const showMealSections = !search.isSearching && appliedCount === 0`
    expect(screen).not.toMatch(/showMealSections\s*=\s*!/u)
    expect(screen).not.toMatch(/showCategoryCarousel\s*=\s*!/u)
    // 칩 줄에서 카테고리를 거르는 필터도 화면에 남아 있으면 안 된다.
    expect(screen).not.toMatch(/entry\.group !== "category"/u)
  })

  it("캐러셀에 서버 표기를 넘기고 옵션 키로 되돌린다", () => {
    // 화면 키(`korean`)를 그대로 넘기면 아무 카테고리도 선택되지 않은 것처럼 보인다 —
    // 두 표기가 다 `string` 이라 tsc 가 잡지 못하는 지점이다.
    expect(screen).toContain("toRecipeListQueryFilters(filters).categories")
    expect(screen).toContain("recipeCategoryOptionKeyForQueryValue(")
    expect(screen).toContain('toggleRecipeFilter(prev, "category", optionKey)')
  })
})

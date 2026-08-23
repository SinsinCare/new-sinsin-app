/**
 * 레시피 홈 **고정층(①)** 회귀 검사 — 2026-08-21 사용자 지시.
 *
 * > "레시피의 카테고리 탭바도 스크롤에 영향 안받게 통일하고 검색바랑 여백 차이 개선
 * >  가능하게 서치바 밑에 넣어야할듯"
 *
 * 같은 메시지에서 커뮤니티 탭에도 같은 것을 지시했다 — **검색이 위, 카테고리가 그 밑,
 * 둘 다 스크롤에 영향 없음.** 두 탭이 같은 문법을 갖는 것이 그 작업의 목표였다.
 *
 * 사용자가 본 "여백 차이" 는 별개의 문제가 아니었다. 레일이 `ListHeaderComponent` 안에
 * 있어서 검색과 레일이 **서로 다른 스크롤 평면**에 있었고, 그래서 그 사이에는 고정층의
 * 아래 패딩(12)과 레일 자신의 여백이 겹쳐 들어가 제목-검색(14)보다 멀었다. 한 덩어리로
 * 읽혀야 할 둘이 더 멀리 있던 것이다. 붙이면 두 문제가 같이 풀린다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 소스 문자열로 검사하나
 *
 * `RecipeHomeScreen` 은 `react-native`·expo-router·tamagui 를 끌고 와 이 저장소의
 * jest(node)에서 렌더할 수 없다. 그래서 **계산은 순수 모듈**(`recipeHomeStickyLayout.ts`)에서
 * 값으로 검사하고, **자리**(무엇이 어느 평면에 있는가)만 소스로 못 박는다.
 * 자리를 검사하지 않으면 다음 리팩터가 레일을 목록 머리로 되돌려도 아무도 모른다.
 */
import fs from "node:fs"
import path from "node:path"

import { SEARCH_TO_RAIL_GAP } from "../src/design-system-v2/tokens/layout"
import { SEARCH_TO_RAIL_GAP as COMMUNITY_SEARCH_TO_RAIL_GAP } from "../src/features/recipe/components/community/communityLayout"
import {
  RECIPE_CATEGORY_RAIL,
  RECIPE_SEARCH_FIELD_HEIGHT,
  RECIPE_STICKY,
  RECIPE_STICKY_BUDGET,
  RECIPE_STICKY_BUDGET_SCREEN_HEIGHT,
  RECIPE_STICKY_TITLE_ROW,
  recipeCategoryRailHeight,
  recipeHomeStickyHeight,
} from "../src/features/recipe/components/list/recipeHomeStickyLayout"
import { resolveRecipeBrowseLayout } from "../src/features/recipe/components/list/recipeHomePresentation"

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, "..", ...segments), "utf8")
}

const SCREEN = read(
  "src",
  "features",
  "recipe",
  "views",
  "RecipeHomeScreen.tsx",
)
const CAROUSEL = read(
  "src",
  "features",
  "recipe",
  "components",
  "list",
  "RecipeCategoryCarousel.tsx",
)
const COMMUNITY_LAYOUT = read(
  "src",
  "features",
  "recipe",
  "components",
  "community",
  "communityLayout.ts",
)

/**
 * 화면의 **고정 평면**만 잘라 낸다 — 고정층 상자의 시작부터, 스크롤하는 것들이
 * 갈라지는 지점(`search.showSuggestions ? …`)까지.
 *
 * 이 경계가 의미 있는 이유: 이 조각 안에 있는 것은 스크롤하지 않고, 밖에 있는 것은
 * 스크롤한다. "무엇이 고정인가" 라는 질문이 문자열 하나로 답해진다.
 */
function stickyPlane(): string {
  const from = SCREEN.indexOf("paddingTop: RECIPE_STICKY.padTop")
  const to = SCREEN.indexOf("{search.showSuggestions ? (")
  expect(from).toBeGreaterThan(-1)
  expect(to).toBeGreaterThan(from)
  return SCREEN.slice(from, to)
}

/**
 * `listHeader` 의 정의부 — `ListHeaderComponent` 로 들어가는 것들, 즉 **스크롤하는** 머리다.
 * 화면 본체의 `return (` 앞까지가 그 범위다.
 */
function listHeaderBody(): string {
  const from = SCREEN.indexOf("const listHeader = useMemo(")
  const to = SCREEN.indexOf("\n  return (", from)
  expect(from).toBeGreaterThan(-1)
  expect(to).toBeGreaterThan(from)
  return SCREEN.slice(from, to)
}

describe("카테고리 레일은 목록 머리가 아니라 고정층에 있다", () => {
  it("`ListHeaderComponent` 안에 레일이 없다", () => {
    // 여기 있으면 스크롤에 딸려 올라간다 — 사용자 지적의 절반이 그것이다.
    expect(listHeaderBody()).not.toContain("RecipeCategoryCarousel")
  })

  it("레일이 검색 필드 **바로 밑**, 같은 고정 평면 안에 있다", () => {
    const plane = stickyPlane()
    expect(plane).toContain("<RecipeSearchField")
    expect(plane).toContain("<RecipeCategoryCarousel")
    // 순서까지 못 박는다 — "서치바 밑에" 가 지시였다.
    expect(plane.indexOf("<RecipeSearchField")).toBeLessThan(
      plane.indexOf("<RecipeCategoryCarousel"),
    )
  })

  it("레일 자리가 옮겨 오면서 조건부 아래 여백은 사라졌다", () => {
    /*
      `paddingBottom: showMealSections ? 18 : 8` 은 "레일과 그 아래 **내용** 사이" 의
      여백이었다. 이제 레일 아래는 내용이 아니라 다른 평면이다 — 고정층의 밑변은
      무엇이 그 밑으로 흘러가든 같은 자리에서 잘라야 하고(아니면 여백이 목록 상태에
      따라 달라진다), 그 자리는 `RECIPE_STICKY.padBottom` 하나가 든다.
    */
    // 주석은 그 결정을 **설명**하므로 코드 범위(`listHeader` 본문)에서만 본다.
    expect(listHeaderBody()).not.toMatch(/paddingBottom:\s*showMealSections/u)
    expect(stickyPlane()).toContain("paddingBottom: RECIPE_STICKY.padBottom")
  })
})

describe("검색↔카테고리 간격은 커뮤니티와 같은 상수에서 온다", () => {
  it("레시피가 쓰는 값 = 커뮤니티가 쓰는 값 = DS 격자의 값", () => {
    // 세 이름이 **같은 하나**를 가리킨다. 값이 우연히 같은 것과는 다르다 — 아래
    // 소스 검사가 "사본이 아니다" 를 따로 못 박는다.
    expect(RECIPE_STICKY.searchToRailGap).toBe(SEARCH_TO_RAIL_GAP)
    expect(COMMUNITY_SEARCH_TO_RAIL_GAP).toBe(SEARCH_TO_RAIL_GAP)
  })

  it("커뮤니티는 값을 다시 적지 않는다 (사본을 두면 한쪽만 고쳐진다)", () => {
    expect(COMMUNITY_LAYOUT).not.toMatch(/SEARCH_TO_RAIL_GAP\s*=\s*spacing\[/u)
    expect(COMMUNITY_LAYOUT).toContain("SHARED_SEARCH_TO_RAIL_GAP")
  })

  it("화면이 그 자리에 숫자를 적지 않는다", () => {
    expect(stickyPlane()).toContain("paddingTop: RECIPE_STICKY.searchToRailGap")
  })

  it("검색↔카테고리가 제목↔검색보다 **좁다** (한 덩어리로 읽혀야 한다)", () => {
    // 사용자가 실기기에서 지적한 것이 정확히 그 반대 상태였다.
    expect(RECIPE_STICKY.searchToRailGap).toBeLessThan(
      RECIPE_STICKY.titleToSearchGap,
    )
  })
})

describe("고정 블록의 높이 예산 — 화면 세로의 1/4", () => {
  it("레일 높이 = 위여백 + 아트상자 + 간격 + 라벨줄 + 아래여백", () => {
    expect(recipeCategoryRailHeight()).toBe(
      RECIPE_CATEGORY_RAIL.slotPadV * 2 +
        RECIPE_CATEGORY_RAIL.artBox +
        RECIPE_CATEGORY_RAIL.artLabelGap +
        RECIPE_CATEGORY_RAIL.labelLineHeight,
    )
    // 2 + 48 + 6 + 18 + 2
    expect(recipeCategoryRailHeight()).toBe(76)
  })

  it("고정 블록 총 높이 = 12 + 32 + 12 + 44 + 8 + 76 + 12 = 196", () => {
    expect(RECIPE_STICKY.padTop).toBe(12)
    expect(RECIPE_STICKY_TITLE_ROW).toBe(32)
    expect(RECIPE_STICKY.titleToSearchGap).toBe(12)
    expect(RECIPE_SEARCH_FIELD_HEIGHT).toBe(44)
    expect(RECIPE_STICKY.searchToRailGap).toBe(8)
    expect(RECIPE_STICKY.padBottom).toBe(12)
    expect(recipeHomeStickyHeight({ hasRail: true })).toBe(196)
  })

  it("레일이 빠지면 `간격 + 레일` 만큼 줄어든다", () => {
    expect(recipeHomeStickyHeight({ hasRail: false })).toBe(112)
    expect(
      recipeHomeStickyHeight({ hasRail: true }) -
        recipeHomeStickyHeight({ hasRail: false }),
    ).toBe(RECIPE_STICKY.searchToRailGap + recipeCategoryRailHeight())
  })

  it("812pt 기준 1/4(203)을 넘지 않는다", () => {
    expect(RECIPE_STICKY_BUDGET).toBe(RECIPE_STICKY_BUDGET_SCREEN_HEIGHT / 4)
    expect(recipeHomeStickyHeight({ hasRail: true })).toBeLessThanOrEqual(
      RECIPE_STICKY_BUDGET,
    )
  })

  it("레일이 자기 숫자를 다시 들고 있지 않다 (예산 산술이 거짓이 되지 않게)", () => {
    expect(CAROUSEL).toContain("RECIPE_CATEGORY_RAIL")
    expect(CAROUSEL).not.toMatch(/const SLOT_WIDTH = \d/u)
    expect(CAROUSEL).not.toMatch(/const ART_BOX = \d/u)
    expect(CAROUSEL).not.toMatch(/paddingVertical=\{\d/u)
  })
})

describe("레일이 숨는 규칙 — 스크롤이 아니라 상태다", () => {
  it("검색 중이면 판정이 레일을 뺀다", () => {
    // 그때는 카테고리가 적용 칩 줄로 나온다(`recipeBrowseLayout.test.ts` 가 그 불변식을
    // 조합 전부에 대해 검사한다). 여기서는 화면이 그 판정을 쓰는지만 본다.
    expect(
      resolveRecipeBrowseLayout({ isSearching: true, appliedFilterCount: 0 })
        .showCategoryCarousel,
    ).toBe(false)
    expect(SCREEN).toContain(
      "const showStickyCategoryRail = showCategoryCarousel &&",
    )
  })

  it("자동완성이 떠 있는 동안에도 뺀다 — 제안은 검색 필드에 붙어야 한다", () => {
    expect(SCREEN).toContain("!search.showSuggestions")
  })

  it("고정층이 줄어드는 순간 목록을 맨 위로 되돌린다 (내용이 튀지 않게)", () => {
    /*
      레일이 빠지면 고정층이 84pt 줄고 목록 뷰포트가 그만큼 커진다. 스크롤 오프셋은
      그대로라 읽던 줄이 위로 튄다. 확정·해제 둘 다에서 되돌려야 한다 — 한쪽만 하면
      돌아오는 길에 반대로 튄다.
    */
    expect(SCREEN).toContain("const resetListToTop = useCallback(")
    // 오프셋 캐시도 같이 되돌린다 — 탭 재탭의 `isAtScrollTop` 이 이 ref 를 읽는다.
    expect(SCREEN).toContain("scrollOffsetRef.current = 0")

    const commit = SCREEN.slice(
      SCREEN.indexOf("const handleCommitSearch = useCallback("),
      SCREEN.indexOf("const handleRemoveFilter = useCallback("),
    )
    expect(commit).toContain("const handleClearSearch = useCallback(")
    // 두 곳에서 부른다: 확정 · 해제.
    expect(commit.match(/resetListToTop\(\)/gu)).toHaveLength(2)
  })
})

describe("고정층에서 사라지면 안 되는 것", () => {
  it("`쓰기`·`보관함` 진입점이 고정층에 남아 있다", () => {
    /*
      제목 줄을 스크롤로 흘려보내는 선택지는 없다. `보관함` 이 없으면
      `app/recipe/saved.tsx`·`recent.tsx`·`RecipeArchiveScreen` 이 어떤 화면에서도
      도달 불가가 되고(딥링크 전용으로 되돌아간다), `쓰기` 는 원래 플로팅에서 올라온
      것이라 이 자리가 사라지면 스크롤 중에 레시피를 쓸 방법이 없다.
    */
    const plane = stickyPlane()
    expect(plane).toContain('router.push("/recipe/saved")')
    expect(plane).toContain('router.push("/(write)/recipe/new")')
    expect(plane).toContain('tr("archive.entry")')
    expect(plane).toContain('tr("list.writeEntry")')
  })
})

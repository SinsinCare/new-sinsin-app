/**
 * 필터 상태(`useRestaurantFilters`). 훅 **본문 자체**를 돌린다 — 상태 전이 규칙을
 * 테스트에 다시 쓰면 원본이 바뀌어도 초록으로 남기 때문이다. `react` 의 훅 4개만
 * 갈아 끼우는 최소 하네스를 쓴다(`tests/helpers/hookHarness.ts` 헤더에 이유가 있다).
 *
 * 지켜야 하는 것 셋:
 *  1. **광역을 바꿔도 이전 광역의 선택이 남는다** (목업 -24: `경기` 활성 상태에서
 *     트레이에 `수원 ✕ 강남 ✕ 서초 ✕` 가 함께 있다). 여기를 "시도 바꾸면 초기화" 로
 *     되돌리면 다중 지역 선택이 불가능해진다.
 *  2. 확정본과 초안이 분리돼 있다 — 시트에서 칩을 누를 때마다 질의가 나가면
 *     `닫기`/`확인` 버튼이 뜻을 잃는다.
 *  3. 시트를 다시 열면 초안이 확정본으로 되맞춰진다(프로토타입은 지난 편집이 남았다).
 */

import { renderHookSync } from "./helpers/hookHarness"
import type { FilterState } from "../src/features/restaurant/types"
import {
  DEFAULT_RESTAURANT_FILTERS,
  parseFilters,
  selectionChips,
  serializeFilters,
  useRestaurantFilters,
} from "../src/features/restaurant/hooks/useRestaurantFilters"
import {
  CUISINE_TYPES,
  NUTRITION_TAGS,
  SORT_OPTIONS,
} from "../src/features/restaurant/data/filterCatalog"

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

function mount(initial: Partial<FilterState> = {}) {
  return renderHookSync(() => useRestaurantFilters(initial))
}

const KNOWN = {
  nutritionTags: NUTRITION_TAGS.map((t) => t.value),
  cuisineTypes: CUISINE_TYPES.map((c) => c.value),
  sorts: SORT_OPTIONS.map((s) => s.value),
}

describe("광역을 바꿔도 이전 광역의 선택은 유지된다 (목업 -24)", () => {
  it("서울에서 강남·서초를 고른 뒤 경기로 옮겨 수원을 더한다", () => {
    const hook = mount()
    hook.result().setActiveSido("seoul")
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("seoul-seocho")

    hook.result().setActiveSido("gyeonggi")
    // 세부 칩 목록만 바뀌고 선택은 그대로다.
    expect(hook.result().draft.activeSido).toBe("gyeonggi")
    expect(hook.result().draft.regionGroups).toEqual([
      "seoul-gangnam",
      "seoul-seocho",
    ])

    hook.result().toggleRegion("gyeonggi-suwon")
    expect(hook.result().draft.regionGroups).toEqual([
      "seoul-gangnam",
      "seoul-seocho",
      "gyeonggi-suwon",
    ])
  })

  it("트레이 칩에 세 지역이 함께 남는다", () => {
    const hook = mount()
    hook.result().setActiveSido("seoul")
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("seoul-seocho")
    hook.result().setActiveSido("gyeonggi")
    hook.result().toggleRegion("gyeonggi-suwon")

    expect(hook.result().chips.map((c) => c.value)).toEqual([
      "seoul-gangnam",
      "seoul-seocho",
      "gyeonggi-suwon",
    ])
    // 라벨은 키로만 넘긴다(화면이 t() 로 그린다). 키 문자열이 그대로 보이면 그건 결함이다.
    expect(hook.result().chips.map((c) => c.labelKey)).toEqual([
      "restaurant.region.groups.seoul-gangnam",
      "restaurant.region.groups.seoul-seocho",
      "restaurant.region.groups.gyeonggi-suwon",
    ])
  })

  it("시도를 여러 번 왕복해도 선택이 사라지지 않는다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    for (const sido of ["gyeonggi", "busan", "jeju", "seoul"]) {
      hook.result().setActiveSido(sido)
    }
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
  })

  it("`<sido>-all` 은 그룹이 아니라 시도 필터로 담긴다", () => {
    const hook = mount()
    hook.result().toggleRegion("gyeonggi-all")
    hook.result().toggleRegion("seoul-gangnam")
    expect(hook.result().draft.regionSidos).toEqual(["gyeonggi"])
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
    // 트레이는 시도 칩을 먼저 그린다.
    expect(hook.result().chips.map((c) => c.axis)).toEqual([
      "regionSido",
      "regionGroup",
    ])
  })

  it("같은 칩을 다시 누르면 해제된다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("seoul-gangnam")
    expect(hook.result().draft.regionGroups).toEqual([])
    hook.result().toggleRegion("seoul-all")
    hook.result().toggleRegion("seoul-all")
    expect(hook.result().draft.regionSidos).toEqual([])
  })
})

describe("전체 해제 (트레이 휴지통)", () => {
  it("지역·영양·음식만 비우고 정렬과 검색어는 남긴다", () => {
    const hook = mount()
    hook.result().setSort("RATING")
    hook.result().setQuery("국밥")
    hook.result().setOpenNow(true)
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("gyeonggi-all")
    hook.result().toggleNutritionTag("LOW_SODIUM")
    hook.result().toggleCuisineType("KOREAN")

    hook.result().clearAllSelections()

    const draft = hook.result().draft
    expect(draft.regionGroups).toEqual([])
    expect(draft.regionSidos).toEqual([])
    expect(draft.nutritionTags).toEqual([])
    expect(draft.cuisineTypes).toEqual([])
    expect(hook.result().chips).toEqual([])
    // 정렬과 검색어는 필터가 아니다 — 휴지통이 그것까지 지우면 목록이 통째로 리셋된다.
    expect(draft.sort).toBe("RATING")
    expect(draft.query).toBe("국밥")
    expect(draft.openNow).toBe(true)
  })

  it("칩 하나만 지우는 것과 다르다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("seoul-seocho")
    hook.result().toggleCuisineType("KOREAN")
    const seocho = hook.result().chips.find((c) => c.value === "seoul-seocho")!

    hook.result().removeChip(seocho)
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().draft.cuisineTypes).toEqual(["KOREAN"])
  })

  it("removeChip 은 축을 보고 지운다 — 같은 문자열이 다른 축에 있어도 안전하다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-all")
    hook.result().toggleRegion("seoul-gangnam")
    const sidoChip = hook.result().chips.find((c) => c.axis === "regionSido")!
    hook.result().removeChip(sidoChip)
    expect(hook.result().draft.regionSidos).toEqual([])
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
  })

  it("resetAll 은 정렬까지 기본값으로 돌린다", () => {
    const hook = mount()
    hook.result().setSort("RATING")
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().applyDraft()
    hook.result().resetAll()
    expect(hook.result().filters).toEqual(DEFAULT_RESTAURANT_FILTERS)
    expect(hook.result().draft).toEqual(DEFAULT_RESTAURANT_FILTERS)
  })
})

describe("칩 개수(axes)는 확정본을 센다", () => {
  it("초안만 고친 상태에서는 개수가 오르지 않는다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleNutritionTag("LOW_SODIUM")
    // 필터칩 행은 지도 화면에 있고, 그 숫자는 **질의에 걸린 조건** 수여야 한다.
    // 시트에서 편집 중인 값을 세면 아직 적용되지 않은 개수를 보여 준다.
    expect(hook.result().axes.region).toEqual({ active: false, count: 0 })
    expect(hook.result().axes.nutrition).toEqual({ active: false, count: 0 })
  })

  it("확인을 누르면 개수가 맞는다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("seoul-seocho")
    hook.result().toggleRegion("gyeonggi-all")
    hook.result().toggleNutritionTag("LOW_SODIUM")
    hook.result().toggleNutritionTag("LOW_POTASSIUM")
    hook.result().toggleCuisineType("KOREAN")
    hook.result().applyDraft()

    // 지역 개수는 그룹 + 시도 합이다(`경기 전체` 도 조건 하나다).
    expect(hook.result().axes.region).toEqual({ active: true, count: 3 })
    expect(hook.result().axes.nutrition).toEqual({ active: true, count: 2 })
    expect(hook.result().axes.cuisine).toEqual({ active: true, count: 1 })
  })

  it("트레이 칩 수와 축 개수 합이 일치한다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().toggleRegion("gyeonggi-all")
    hook.result().toggleNutritionTag("LOW_SODIUM")
    hook.result().toggleCuisineType("KOREAN")
    hook.result().applyDraft()
    const axes = hook.result().axes
    expect(hook.result().chips).toHaveLength(
      axes.region.count + axes.nutrition.count + axes.cuisine.count,
    )
  })

  it("트레이 칩 순서는 지역 → 음식 → 영양 축 고정이다", () => {
    const hook = mount()
    hook.result().toggleNutritionTag("LOW_SODIUM")
    hook.result().toggleCuisineType("KOREAN")
    hook.result().toggleRegion("seoul-gangnam")
    // 사용자가 고른 순서를 재현할 수 없으므로 축 순서를 고정한다.
    expect(hook.result().chips.map((c) => c.axis)).toEqual([
      "regionGroup",
      "cuisineType",
      "nutritionTag",
    ])
  })
})

describe("확정본과 초안", () => {
  it("시트 편집은 확정본을 건드리지 않는다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    expect(hook.result().filters.regionGroups).toEqual([])
    expect(hook.result().isDraftDirty).toBe(true)

    hook.result().applyDraft()
    expect(hook.result().filters.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().isDraftDirty).toBe(false)
  })

  it("시트를 다시 열면 초안이 확정본으로 되맞춰진다", () => {
    const hook = mount()
    hook.result().toggleRegion("seoul-gangnam")
    hook.result().applyDraft()

    // 두 번째로 열어 편집하다 닫는다(확인을 누르지 않는다).
    hook.result().toggleRegion("seoul-seocho")
    expect(hook.result().draft.regionGroups).toHaveLength(2)

    hook.result().syncDraft()
    // 프로토타입은 `useState(current)` + Modal 상주라 지난 편집이 그대로 남았다.
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().isDraftDirty).toBe(false)
  })

  it("칩 순서만 다른 선택은 dirty 가 아니다", () => {
    const hook = mount()
    hook.result().toggleNutritionTag("LOW_SODIUM")
    hook.result().toggleNutritionTag("LOW_POTASSIUM")
    hook.result().applyDraft()

    hook.result().clearAllSelections()
    hook.result().toggleNutritionTag("LOW_POTASSIUM")
    hook.result().toggleNutritionTag("LOW_SODIUM")
    // 같은 질의인데 `확인` 이 활성으로 남으면 사용자는 안 바뀐 것을 다시 적용한다.
    expect(hook.result().isDraftDirty).toBe(false)
  })
})

describe("시트 밖 컨트롤은 즉시 확정된다", () => {
  it("지역 검색 이동은 이전 지역만 해제하고 다른 확정 조건을 보존한다", () => {
    const hook = mount({
      regionGroups: ["seoul-seocho"],
      regionSidos: ["busan"],
      cuisineTypes: ["KOREAN"],
      nutritionTags: ["LOW_SODIUM"],
      query: "국밥",
      sort: "RATING",
      openNow: true,
      bookmarkedOnly: true,
    })
    const confirmed = hook.result().filters
    hook.result().toggleCuisineType("JAPANESE")
    hook.result().clearRegionSelection()
    expect(hook.result().filters).toEqual({
      ...confirmed,
      regionGroups: [],
      regionSidos: [],
    })
    expect(hook.result().draft).toEqual(hook.result().filters)
  })

  it("정렬·검색어·영업중·북마크는 초안을 거치지 않는다", () => {
    const hook = mount()
    hook.result().setSort("PRICE_LOW")
    hook.result().setQuery("국밥")
    hook.result().setOpenNow(true)
    hook.result().toggleBookmarkedOnly()

    expect(hook.result().filters.sort).toBe("PRICE_LOW")
    expect(hook.result().filters.query).toBe("국밥")
    expect(hook.result().filters.openNow).toBe(true)
    expect(hook.result().filters.bookmarkedOnly).toBe(true)
    // 초안도 같이 움직여야 시트를 열었을 때 `확인` 이 이유 없이 활성이 되지 않는다.
    expect(hook.result().isDraftDirty).toBe(false)
  })

  it("상단 칩도 복수 선택하며 누른 항목만 해제한다", () => {
    const hook = mount()
    hook.result().toggleRailCuisine("KOREAN")
    hook.result().toggleRailCuisine("JAPANESE")
    expect(hook.result().filters.cuisineTypes).toEqual(["KOREAN", "JAPANESE"])
    expect(hook.result().draft.cuisineTypes).toEqual(["KOREAN", "JAPANESE"])
    hook.result().toggleRailCuisine("KOREAN")
    expect(hook.result().filters.cuisineTypes).toEqual(["JAPANESE"])
    hook.result().toggleRailCuisine("JAPANESE")
    expect(hook.result().filters.cuisineTypes).toEqual([])
    expect(hook.result().isDraftDirty).toBe(false)
  })

  it("필터의 복수 선택에 상단 칩을 더하고 개별 해제해도 나머지는 유지한다", () => {
    const hook = mount()
    hook.result().toggleCuisineType("KOREAN")
    hook.result().toggleCuisineType("CHINESE")
    hook.result().applyDraft()
    hook.result().toggleRailCuisine("JAPANESE")
    expect(hook.result().filters.cuisineTypes).toEqual([
      "KOREAN",
      "CHINESE",
      "JAPANESE",
    ])
    expect(hook.result().axes.cuisine.count).toBe(3)
    hook.result().toggleRailCuisine("CHINESE")
    hook.result().syncDraft()
    expect(hook.result().draft.cuisineTypes).toEqual(["KOREAN", "JAPANESE"])
    expect(hook.result().axes.cuisine.count).toBe(2)
  })

  it("닫은 필터의 미확정 선택은 상단 칩을 누를 때 되살아나지 않는다", () => {
    const hook = mount({ cuisineTypes: ["KOREAN"] })
    hook.result().toggleCuisineType("CHINESE")
    hook.result().setDraftOpenNow(true)
    // Closing without applying leaves a discarded draft until the next open.
    hook.result().toggleRailCuisine("JAPANESE")
    expect(hook.result().filters.cuisineTypes).toEqual(["KOREAN", "JAPANESE"])
    expect(hook.result().draft).toEqual(hook.result().filters)
    expect(hook.result().draft.openNow).toBe(false)
  })
})

describe("위치가 없으면 거리순을 조용히 되돌린다", () => {
  it("위치가 있으면 그대로 둔다", () => {
    const hook = mount()
    hook.result().setSort("DISTANCE")
    hook.result().sanitizeSortForLocation(true)
    expect(hook.result().filters.sort).toBe("DISTANCE")
  })

  it("위치가 없으면 기본 정렬로 내린다", () => {
    const hook = mount()
    hook.result().setSort("DISTANCE")
    hook.result().sanitizeSortForLocation(false)
    // 서버가 거리를 계산하지 못하면 정렬이 무의미해진다. 막는 대신 조용히 되돌린다.
    expect(hook.result().filters.sort).toBe("RECOMMENDED")
    expect(hook.result().draft.sort).toBe("RECOMMENDED")
  })

  it("거리순이 아니면 아무 것도 하지 않는다", () => {
    const hook = mount()
    hook.result().setSort("RATING")
    hook.result().sanitizeSortForLocation(false)
    expect(hook.result().filters.sort).toBe("RATING")
  })
})

describe("AI 검색 결과 적용", () => {
  it("`<sido>-all` 을 시도 필터로 옮겨 담는다", () => {
    const hook = mount()
    hook.result().applyAiFilters({
      cuisineTypes: ["KOREAN"],
      nutritionTags: ["LOW_SODIUM"],
      regionGroups: ["seoul-gangnam", "gyeonggi-all"],
      sort: "RATING",
      openNow: true,
      maxPrice: null,
    })
    expect(hook.result().filters.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().filters.regionSidos).toEqual(["gyeonggi"])
    expect(hook.result().filters.sort).toBe("RATING")
    expect(hook.result().filters.openNow).toBe(true)
    expect(hook.result().isDraftDirty).toBe(false)
  })

  it("AI 가 정렬·영업중을 말하지 않으면 기존 값을 지킨다", () => {
    const hook = mount()
    hook.result().setSort("PRICE_LOW")
    hook.result().setOpenNow(true)
    hook.result().applyAiFilters({
      cuisineTypes: [],
      nutritionTags: [],
      regionGroups: [],
      sort: null,
      openNow: null,
      maxPrice: null,
    })
    expect(hook.result().filters.sort).toBe("PRICE_LOW")
    expect(hook.result().filters.openNow).toBe(true)
  })

  /**
   * 서버 응답은 우리가 쓴 값이 아니다. 검증 없이 담으면 이 기능을 망가뜨렸던 그 사고가
   * 그대로 재현된다 — LLM 이 한글 라벨(`강남`)을 돌려주면 그 키가 서버로 나가 0건이 되고,
   * 선택 트레이 칩은 i18n 을 못 찾아 `restaurant.region.groups.강남` 이라는 **키 문자열**을
   * 화면에 그린다. (프롬프트 예시가 한동안 그 모양이었다.)
   */
  it("카탈로그에 없는 키는 버린다 — 한글 라벨·오타·유령 그룹", () => {
    const hook = mount()
    hook.result().applyAiFilters({
      cuisineTypes: [],
      nutritionTags: [],
      regionGroups: ["강남", "seoul-gangnam", "gyeonggi-icheon", "seoul"],
      sort: null,
      openNow: null,
      maxPrice: null,
    })
    expect(hook.result().filters.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().filters.regionSidos).toEqual([])
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
  })

  /**
   * `부산전체-all` 은 접미어만 맞다. 검증하지 않으면 `부산전체` 라는 없는 시도 키가 서버로
   * 나가고, 서버는 모르는 시도를 무시해 **필터가 안 걸린 전체 목록**을 준다(실측: 376건).
   * 0건보다 나쁘다 — 사용자는 필터가 걸렸다고 믿는다.
   */
  it("`-all` 접미어만 맞는 값으로 없는 시도 키를 만들지 않는다", () => {
    const hook = mount()
    hook.result().applyAiFilters({
      cuisineTypes: [],
      nutritionTags: [],
      regionGroups: ["부산전체-all", "seoul-typo-all", "busan-all"],
      sort: null,
      openNow: null,
      maxPrice: null,
    })
    expect(hook.result().filters.regionSidos).toEqual(["busan"])
    expect(hook.result().filters.regionGroups).toEqual([])
  })
})

describe("초기값", () => {
  it("기본 정렬은 추천순이고 아무 필터도 걸리지 않았다", () => {
    const hook = mount()
    expect(hook.result().filters).toEqual(DEFAULT_RESTAURANT_FILTERS)
    expect(hook.result().chips).toEqual([])
    expect(hook.result().axes.region.active).toBe(false)
  })

  it("링크로 들어온 초기값을 확정본과 초안 둘 다에 싣는다", () => {
    const hook = mount({ regionGroups: ["seoul-gangnam"], sort: "RATING" })
    expect(hook.result().filters.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().draft.regionGroups).toEqual(["seoul-gangnam"])
    expect(hook.result().isDraftDirty).toBe(false)
  })
})

describe("직렬화 왕복 (딥링크·라우트 파라미터)", () => {
  it("값이 없는 축은 키를 넣지 않는다", () => {
    expect(serializeFilters(DEFAULT_RESTAURANT_FILTERS)).toBe("")
  })

  it("왕복이 무손실이다", () => {
    const state: FilterState = {
      ...DEFAULT_RESTAURANT_FILTERS,
      activeSido: "seoul",
      regionGroups: ["seoul-gangnam", "gyeonggi-suwon"],
      regionSidos: ["busan"],
      nutritionTags: ["LOW_SODIUM"],
      cuisineTypes: ["KOREAN"],
      sort: "RATING",
      openNow: true,
      bookmarkedOnly: true,
      query: "국밥",
    }
    const parsed = parseFilters(serializeFilters(state), KNOWN)
    expect(parsed.regionGroups.sort()).toEqual(
      ["gyeonggi-suwon", "seoul-gangnam"].sort(),
    )
    expect(parsed.regionSidos).toEqual(["busan"])
    expect(parsed.nutritionTags).toEqual(["LOW_SODIUM"])
    expect(parsed.cuisineTypes).toEqual(["KOREAN"])
    expect(parsed.sort).toBe("RATING")
    expect(parsed.openNow).toBe(true)
    expect(parsed.bookmarkedOnly).toBe(true)
    expect(parsed.query).toBe("국밥")
    // 링크로 들어와도 세부 칩 목록을 그릴 수 있게 첫 그룹의 시도를 활성으로 둔다.
    expect(parsed.activeSido).toBe(parsed.regionGroups[0].split("-")[0])
  })

  it("사라진 지역 키와 모르는 열거형은 버린다", () => {
    // 옛 링크에 없는 그룹이 남아 있으면 칩이 키 문자열을 그대로 보여 주고 서버는 0건을 준다.
    const parsed = parseFilters(
      "regionGroups=gyeonggi-icheon,seoul-gangnam&regionSidos=atlantis&nutritionTags=LOW_FAT&cuisineTypes=FUSION&sort=CHAOS",
      KNOWN,
    )
    expect(parsed.regionGroups).toEqual(["seoul-gangnam"])
    expect(parsed.regionSidos).toEqual([])
    expect(parsed.nutritionTags).toEqual([])
    expect(parsed.cuisineTypes).toEqual([])
    expect(parsed.sort).toBe("RECOMMENDED")
  })

  /**
   * `regionGroups` 축에는 **그룹 키만** 들어갈 수 있다. 라벨 조회 함수(`labelKeyFor`)로
   * 걸렀을 때는 시도 키와 `<sido>-all` 까지 통과해서, 그 값들이 그룹 필터로 서버에 나가
   * 조용히 0건이 됐다 — 서버는 `-all` 을 `region_group` 에 저장하지 않는다(카탈로그 규칙 3).
   */
  it("시도 키와 `<sido>-all` 은 그룹 축에서 버린다", () => {
    const parsed = parseFilters(
      "regionGroups=seoul,seoul-all,seoul-gangnam&regionSidos=busan,busan-all",
      KNOWN,
    )
    expect(parsed.regionGroups).toEqual(["seoul-gangnam"])
    // `regionSidos` 축은 맨 시도 키다. `busan-all` 은 그 축에서도 유효한 값이 아니다.
    expect(parsed.regionSidos).toEqual(["busan"])
  })

  it("빈 문자열·깨진 조각을 먹여도 기본값으로 산다", () => {
    expect(parseFilters("", KNOWN)).toEqual({
      ...DEFAULT_RESTAURANT_FILTERS,
      activeSido: null,
    })
    expect(() => parseFilters("&&=&sort", KNOWN)).not.toThrow()
  })

  it("한글 검색어가 인코딩을 왕복한다", () => {
    const serialized = serializeFilters({
      ...DEFAULT_RESTAURANT_FILTERS,
      query: "저염 국밥 & 김치",
    })
    expect(serialized).toContain("q=")
    expect(parseFilters(serialized, KNOWN).query).toBe("저염 국밥 & 김치")
  })
})

describe("selectionChips (순수 함수)", () => {
  it("모르는 그룹 키가 들어와도 키를 만들어 화면이 터지지 않게 한다", () => {
    const chips = selectionChips({
      ...DEFAULT_RESTAURANT_FILTERS,
      regionGroups: ["gyeonggi-icheon"],
      regionSidos: ["atlantis"],
    })
    expect(chips.map((c) => c.labelKey)).toEqual([
      "restaurant.filter.regions.atlantis",
      "restaurant.region.groups.gyeonggi-icheon",
    ])
  })
})

describe("section filter draft transaction", () => {
  it("sort, opening hours and other axes apply together only after confirmation", () => {
    const hook = mount()
    hook.result().setDraftSort("RATING")
    hook.result().setDraftOpenNow(true)
    hook.result().toggleCuisineType("KOREAN")
    expect(hook.result().filters).toMatchObject({
      sort: "RECOMMENDED",
      openNow: false,
      cuisineTypes: [],
    })
    hook.result().applyDraft()
    expect(hook.result().filters).toMatchObject({
      sort: "RATING",
      openNow: true,
      cuisineTypes: ["KOREAN"],
    })
  })
  it("reopening discards edits, including a reset that was never applied", () => {
    const hook = mount({
      query: "국밥",
      bookmarkedOnly: true,
      sort: "RATING",
      openNow: true,
      cuisineTypes: ["KOREAN"],
    })
    hook.result().resetDraft()
    expect(hook.result().draft).toMatchObject({
      query: "국밥",
      bookmarkedOnly: true,
      sort: "RECOMMENDED",
      openNow: false,
      cuisineTypes: [],
    })
    expect(hook.result().filters.sort).toBe("RATING")
    hook.result().syncDraft()
    expect(hook.result().draft).toEqual(hook.result().filters)
  })
  it("confirmed reset clears every section but preserves query and saved scope", () => {
    const hook = mount({
      query: "국밥",
      bookmarkedOnly: true,
      sort: "RATING",
      openNow: true,
      cuisineTypes: ["KOREAN"],
      nutritionTags: ["LOW_SODIUM"],
      regionGroups: ["seoul-gangnam"],
    })
    hook.result().resetDraft()
    hook.result().applyDraft()
    expect(hook.result().filters).toMatchObject({
      query: "국밥",
      bookmarkedOnly: true,
      sort: "RECOMMENDED",
      openNow: false,
      cuisineTypes: [],
      nutritionTags: [],
      regionGroups: [],
      regionSidos: [],
    })
  })
})

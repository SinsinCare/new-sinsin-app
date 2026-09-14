/**
 * 필터 상태의 유일한 소유자. 지도·목록·필터시트가 전부 이 훅을 공유한다.
 *
 * ## 확정본과 초안을 나눈다
 *
 * `filters` 는 **확정된** 필터고 질의에 쓰인다. `draft` 는 필터 시트에서 편집 중인 사본이다.
 * 시트에서 칩을 누를 때마다 질의가 나가면 (1) 요청이 칩 수만큼 나가고 (2) `확인`/`닫기`
 * 버튼이 뜻을 잃는다. 목업의 footer 가 `닫기`/`확인` 두 개인 이유가 그것이다.
 *
 * ## 시트를 다시 열 때 초안을 되맞춘다 (프로토타입 버그)
 *
 * 프로토타입의 두 필터 시트는 `useState(current)` 로 초기화하고 Modal 을 계속 마운트해 둬서
 * **두 번째로 열면 지난번 편집 상태가 그대로 남아** 있었다. `syncDraft()` 를 시트가 열릴 때
 * 부르는 것이 그 대응이다 — 열림 시점에 확정본을 다시 복사한다.
 *
 * ## 광역을 바꿔도 이전 선택은 유지된다
 *
 * 목업 -24 에서 `경기`로 바꾼 뒤에도 `강남`·`서초` 선택이 남아 있다. 즉 `activeSido` 는
 * **어느 세부 칩 목록을 보여 줄지**만 정하고 선택을 지우지 않는다. 여기를 "시도 바꾸면
 * 초기화" 로 바꾸면 다중 지역 선택이 불가능해진다.
 *
 * ## 여기 없는 것
 *
 * 선택 트레이(`chips`·`removeChip`·`clearAllSelections`)와 시트 밖 즉시 정렬(`setSort`),
 * `isDraftDirty` 가 있었다. 정렬은 `FilterSheet` 의 sort 섹션(`setDraftSort` → `applyDraft`)
 * 으로 합쳐졌고 트레이는 화면에서 빠졌는데 훅에만 남아 있어서 지웠다 — 부르는 화면이
 * 없는 상태 전이는 테스트만 초록으로 남기고 제품은 지키지 않는다.
 */

import { useCallback, useMemo, useState } from "react"

import type {
  AiSearchFilters,
  CuisineType,
  FilterState,
  NutritionTag,
  SortOption,
} from "../types"
import { DEFAULT_SORT } from "../data/filterCatalog"
import {
  isRegionGroupKey,
  isRegionSidoKey,
  isSidoAllKey,
  sidoKeyOf,
  sidoKeyOfAllKey,
} from "../data/regionCatalog"

export const DEFAULT_RESTAURANT_FILTERS: FilterState = {
  activeSido: null,
  regionGroups: [],
  regionSidos: [],
  nutritionTags: [],
  cuisineTypes: [],
  sort: DEFAULT_SORT,
  openNow: false,
  bookmarkedOnly: false,
  query: "",
}

/** 목업의 필터칩 행. 각 축이 활성인지와 몇 개가 걸렸는지를 함께 보여 준다. */
export interface FilterAxisState {
  active: boolean
  count: number
}

export interface UseRestaurantFiltersResult {
  /** 확정본. 질의에 쓴다. */
  filters: FilterState
  /** 시트 편집용 사본. */
  draft: FilterState
  axes: {
    region: FilterAxisState
    nutrition: FilterAxisState
    cuisine: FilterAxisState
  }

  /* 초안 편집 — 시트 안에서만 쓴다 */
  setActiveSido: (sidoKey: string) => void
  /** `<sido>-all` 이면 시도 필터로, 아니면 그룹 필터로 담는다. */
  toggleRegion: (groupKey: string) => void
  toggleNutritionTag: (tag: NutritionTag) => void
  toggleCuisineType: (type: CuisineType) => void
  /** 시트를 열 때 호출. 확정본을 초안에 다시 복사한다. */
  syncDraft: () => void
  /** `확인`. 초안을 확정한다. */
  applyDraft: () => void
  setDraftSort: (sort: SortOption) => void
  setDraftOpenNow: (openNow: boolean) => void
  resetDraft: () => void

  /* 즉시 반영 — 시트 밖의 컨트롤 */
  setOpenNow: (openNow: boolean) => void
  toggleBookmarkedOnly: () => void
  setQuery: (query: string) => void
  clearRegionSelection: () => void
  /** 필터 시트와 같은 복수 선택. 칩 하나만 토글하고 즉시 반영한다. */
  toggleRailCuisine: (type: CuisineType) => void
  /** AI 검색 결과 적용. 사용자가 눌러서 적용할 때만 부른다. */
  applyAiFilters: (ai: AiSearchFilters) => void
  resetAll: () => void
  /**
   * 위치가 없으면 `DISTANCE` 를 쓸 수 없다. 정렬을 바꾸지 못하게 막는 대신
   * 조용히 기본값으로 되돌린다 — 서버가 거리를 계산하지 못해 정렬이 무의미해지므로.
   */
  sanitizeSortForLocation: (hasLocation: boolean) => void
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

export function useRestaurantFilters(
  initial: Partial<FilterState> = {},
): UseRestaurantFiltersResult {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_RESTAURANT_FILTERS,
    ...initial,
  })
  const [draft, setDraft] = useState<FilterState>({
    ...DEFAULT_RESTAURANT_FILTERS,
    ...initial,
  })

  const setActiveSido = useCallback((sidoKey: string) => {
    // 선택은 지우지 않는다 — 목업 -24 가 시도를 바꿔도 이전 선택을 유지한다.
    setDraft((prev) => ({ ...prev, activeSido: sidoKey }))
  }, [])

  const toggleRegion = useCallback((groupKey: string) => {
    setDraft((prev) => {
      if (isSidoAllKey(groupKey)) {
        const sido = sidoKeyOf(groupKey)
        return { ...prev, regionSidos: toggleValue(prev.regionSidos, sido) }
      }
      return { ...prev, regionGroups: toggleValue(prev.regionGroups, groupKey) }
    })
  }, [])

  const toggleNutritionTag = useCallback((tag: NutritionTag) => {
    setDraft((prev) => ({
      ...prev,
      nutritionTags: toggleValue(prev.nutritionTags, tag),
    }))
  }, [])

  const toggleCuisineType = useCallback((type: CuisineType) => {
    setDraft((prev) => ({
      ...prev,
      cuisineTypes: toggleValue(prev.cuisineTypes, type),
    }))
  }, [])

  const syncDraft = useCallback(() => {
    setDraft(filters)
  }, [filters])

  const applyDraft = useCallback(() => {
    setFilters(draft)
  }, [draft])

  const setDraftSort = useCallback((sort: SortOption) => {
    setDraft((prev) => ({ ...prev, sort }))
  }, [])
  const setDraftOpenNow = useCallback((openNow: boolean) => {
    setDraft((prev) => ({ ...prev, openNow }))
  }, [])
  const resetDraft = useCallback(() => {
    setDraft((prev) => ({
      ...DEFAULT_RESTAURANT_FILTERS,
      // Reset sheet controls; preserve the search and saved-place scope outside it.
      query: prev.query,
      bookmarkedOnly: prev.bookmarkedOnly,
      activeSido: prev.activeSido,
    }))
  }, [])

  /* 시트 밖 컨트롤 — 초안을 거치지 않고 바로 확정한다. 칩 레일과 북마크 FAB 는 누르는
     즉시 결과가 바뀌는 것이 목업의 동작이다. */

  const setOpenNow = useCallback((openNow: boolean) => {
    setFilters((prev) => ({ ...prev, openNow }))
    setDraft((prev) => ({ ...prev, openNow }))
  }, [])

  const toggleBookmarkedOnly = useCallback(() => {
    setFilters((prev) => ({ ...prev, bookmarkedOnly: !prev.bookmarkedOnly }))
    setDraft((prev) => ({ ...prev, bookmarkedOnly: !prev.bookmarkedOnly }))
  }, [])

  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }))
    setDraft((prev) => ({ ...prev, query }))
  }, [])

  // A search destination replaces the previous geographic scope. Keep other
  // confirmed preferences, and do not revive edits from a cancelled sheet.
  const clearRegionSelection = useCallback(() => {
    const next = { ...filters, regionGroups: [], regionSidos: [] }
    setFilters(next)
    setDraft(next)
  }, [filters])

  const toggleRailCuisine = useCallback(
    (type: CuisineType) => {
      const next = {
        ...filters,
        cuisineTypes: toggleValue(filters.cuisineTypes, type),
      }
      setFilters(next)
      // Outside the sheet, start from committed selections. A cancelled draft
      // must not reappear when the rail edits one category.
      setDraft(next)
    },
    [filters],
  )

  const applyAiFilters = useCallback((ai: AiSearchFilters) => {
    const { regionGroups, regionSidos } = splitAiRegionKeys(ai.regionGroups)
    /*
      **음식 이름은 축이 아니라 검색어로 들어간다.**

      `삼계탕` 은 종류 축에서 `한식` 으로 접히는데, 그것만 적용하면 조건이 넓어져
      한식 전체가 나온다(QA 2026-08-05). 서버가 음식 이름을 `q` 로 따로 돌려주므로
      그 값을 검색어에 실어 상호·메뉴명에서 걸리게 한다. 서버가 안 주면(구버전) 빈
      문자열로 두어 예전 동작 그대로다 — 이전 질의의 검색어가 남지는 않게 한다.
    */
    const query = ai.q ?? ""
    setFilters((prev) => {
      const next: FilterState = {
        ...prev,
        query,
        cuisineTypes: ai.cuisineTypes,
        nutritionTags: ai.nutritionTags,
        regionGroups,
        regionSidos,
        sort: ai.sort ?? prev.sort,
        openNow: ai.openNow ?? prev.openNow,
      }
      return next
    })
    setDraft((prev) => ({
      ...prev,
      query,
      cuisineTypes: ai.cuisineTypes,
      nutritionTags: ai.nutritionTags,
      regionGroups,
      regionSidos,
      sort: ai.sort ?? prev.sort,
      openNow: ai.openNow ?? prev.openNow,
    }))
  }, [])

  const resetAll = useCallback(() => {
    setFilters(DEFAULT_RESTAURANT_FILTERS)
    setDraft(DEFAULT_RESTAURANT_FILTERS)
  }, [])

  const sanitizeSortForLocation = useCallback((hasLocation: boolean) => {
    if (hasLocation) return
    setFilters((prev) =>
      prev.sort === "DISTANCE" ? { ...prev, sort: DEFAULT_SORT } : prev,
    )
    setDraft((prev) =>
      prev.sort === "DISTANCE" ? { ...prev, sort: DEFAULT_SORT } : prev,
    )
  }, [])

  const axes = useMemo(
    () => ({
      region: {
        active: filters.regionGroups.length + filters.regionSidos.length > 0,
        count: filters.regionGroups.length + filters.regionSidos.length,
      },
      nutrition: {
        active: filters.nutritionTags.length > 0,
        count: filters.nutritionTags.length,
      },
      cuisine: {
        active: filters.cuisineTypes.length > 0,
        count: filters.cuisineTypes.length,
      },
    }),
    [filters],
  )

  /* 결과 객체를 렌더마다 새로 만들지 않는다. 지도 화면이 `[controls]` 를 의존성으로 둔
     콜백(`handleToggleCuisine`·`handleApplyFilters`…)을 갖고 있어, 리터럴을 돌려주면
     그 콜백들이 매 렌더 새로 만들어져 시트와 칩 레일까지 다시 그린다. */
  return useMemo<UseRestaurantFiltersResult>(
    () => ({
      filters,
      draft,
      axes,
      setActiveSido,
      toggleRegion,
      toggleNutritionTag,
      toggleCuisineType,
      syncDraft,
      applyDraft,
      setDraftSort,
      setDraftOpenNow,
      resetDraft,
      setOpenNow,
      toggleBookmarkedOnly,
      setQuery,
      clearRegionSelection,
      toggleRailCuisine,
      applyAiFilters,
      resetAll,
      sanitizeSortForLocation,
    }),
    [
      filters,
      draft,
      axes,
      setActiveSido,
      toggleRegion,
      toggleNutritionTag,
      toggleCuisineType,
      syncDraft,
      applyDraft,
      setDraftSort,
      setDraftOpenNow,
      resetDraft,
      setOpenNow,
      toggleBookmarkedOnly,
      setQuery,
      clearRegionSelection,
      toggleRailCuisine,
      applyAiFilters,
      resetAll,
      sanitizeSortForLocation,
    ],
  )
}

/**
 * `POST /ai-search` 가 준 하나의 `regionGroups` 배열을 두 축으로 쪼개고 **검증한다.**
 *
 * 서버 응답은 우리가 쓴 값이 아니다. 검증 없이 넣으면 두 가지가 조용히 깨진다:
 *
 * 1. 카탈로그에 없는 키(예: LLM 이 한글 라벨 `강남` 을 돌려주는 경우 — 프롬프트 예시가
 *    한동안 그 모양이었다)가 그대로 서버에 나가 **0건**이 되고, 선택 트레이 칩은 i18n 을
 *    못 찾아 `restaurant.region.groups.강남` 이라는 **키 문자열을 화면에 그린다.**
 * 2. `부산전체-all` 처럼 접미어만 맞는 값은 `sidoKeyOf` 가 `부산전체` 라는 없는 시도 키로
 *    만들고, 서버는 모르는 시도를 무시해 **필터가 아예 안 걸린 전체 목록**을 준다.
 *    0건보다 나쁘다 — 사용자는 필터가 걸렸다고 믿는다.
 *
 * 그래서 모르는 키는 **버린다.** AI 가 못 옮긴 표현은 `unmatchedTerms` 로 이미 정직하게
 * 표시되므로, 여기서 조용히 버리는 것이 화면에 거짓 필터를 남기는 것보다 낫다.
 */
export function splitAiRegionKeys(keys: readonly string[]): {
  regionGroups: string[]
  regionSidos: string[]
} {
  const regionGroups: string[] = []
  const regionSidos: string[] = []
  for (const key of keys) {
    if (isSidoAllKey(key)) {
      // `sidoKeyOf` 가 아니라 이쪽이다 — 그 함수는 첫 하이픈에서 잘라서
      // `seoul-typo-all` 을 서울 전체로 만들어 버린다(해당 함수 주석 참고).
      const sido = sidoKeyOfAllKey(key)
      if (sido !== null) regionSidos.push(sido)
      continue
    }
    if (isRegionGroupKey(key)) regionGroups.push(key)
  }
  return { regionGroups, regionSidos }
}

/**
 * 필터를 URL 쿼리 문자열로. 라우트 파라미터로 리스트 화면에 넘기거나 딥링크를 만들 때 쓴다.
 * 값이 없는 축은 키를 아예 넣지 않아 링크가 짧게 유지된다.
 */
export function serializeFilters(state: FilterState): string {
  const params: string[] = []
  const push = (key: string, value: string) => {
    if (value) params.push(`${key}=${encodeURIComponent(value)}`)
  }
  push("regionGroups", [...state.regionGroups].sort().join(","))
  push("regionSidos", [...state.regionSidos].sort().join(","))
  push("nutritionTags", [...state.nutritionTags].sort().join(","))
  push("cuisineTypes", [...state.cuisineTypes].sort().join(","))
  if (state.sort !== DEFAULT_SORT) push("sort", state.sort)
  if (state.openNow) push("openNow", "1")
  if (state.bookmarkedOnly) push("bookmarkedOnly", "1")
  push("q", state.query.trim())
  return params.join("&")
}

/**
 * 위 직렬화의 역. 모르는 값은 **버린다** — 옛 링크에 사라진 지역 키가 들어 있어도
 * 화면이 터지지 않고, 서버에 없는 열거형을 보내 400 을 받지도 않는다.
 */
export function parseFilters(
  serialized: string,
  known: {
    nutritionTags: readonly NutritionTag[]
    cuisineTypes: readonly CuisineType[]
    sorts: readonly SortOption[]
  },
): FilterState {
  const entries = new Map<string, string>()
  for (const part of serialized.split("&")) {
    if (!part) continue
    const index = part.indexOf("=")
    if (index === -1) continue
    entries.set(part.slice(0, index), decodeURIComponent(part.slice(index + 1)))
  }
  const list = (key: string): string[] => {
    const raw = entries.get(key)
    if (!raw) return []
    return raw.split(",").filter((v) => v.length > 0)
  }
  const sortRaw = entries.get("sort") as SortOption | undefined
  // 카탈로그에 없는 지역 키는 버린다. 옛 링크에 사라진 그룹이 남아 있으면 칩이 키 문자열을
  // 그대로 보여 주고("gyeonggi-icheon"), 서버는 0건을 준다 — 둘 다 사용자에게 설명이 안 된다.
  // `labelKeyFor` 로 걸러서는 안 된다 — 그 함수는 시도 키와 `<sido>-all` 까지 통과시켜서
  // `regionGroups=seoul` / `regionGroups=seoul-all` 이 그룹 필터로 서버에 나가고 조용히
  // 0건이 된다(서버는 `-all` 을 `region_group` 에 저장하지 않는다). 축별 술어를 쓴다.
  const regionGroups = list("regionGroups").filter(isRegionGroupKey)
  const regionSidos = list("regionSidos").filter(isRegionSidoKey)
  return {
    ...DEFAULT_RESTAURANT_FILTERS,
    regionGroups,
    regionSidos,
    nutritionTags: list("nutritionTags").filter((v): v is NutritionTag =>
      (known.nutritionTags as readonly string[]).includes(v),
    ),
    cuisineTypes: list("cuisineTypes").filter((v): v is CuisineType =>
      (known.cuisineTypes as readonly string[]).includes(v),
    ),
    sort:
      sortRaw && (known.sorts as readonly string[]).includes(sortRaw)
        ? sortRaw
        : DEFAULT_SORT,
    openNow: entries.get("openNow") === "1",
    bookmarkedOnly: entries.get("bookmarkedOnly") === "1",
    query: entries.get("q") ?? "",
    // 링크로 들어왔을 때 세부 칩 목록을 그릴 수 있게 첫 그룹의 시도를 활성으로 둔다.
    activeSido: regionGroups.length > 0 ? sidoKeyOf(regionGroups[0]) : null,
  }
}

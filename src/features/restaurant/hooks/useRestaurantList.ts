/**
 * 목록(시트 / 리스트 전용 모드) 무한 스크롤. 커서 페이지네이션만 쓴다 — OFFSET 금지.
 *
 * ## 왜 지도 질의와 별도인가
 *
 * 지도 응답(`/map`)은 마커만 주고 카드 정보를 싣지 않는다. 마커 200개에 사진 3장씩
 * 실으면 그것만으로 응답이 수백 KB 다. 그래서 시트 목록은 `/search` 로 따로 받는다.
 * 두 질의는 같은 필터를 쓰지만 **캐시가 분리돼 있어야** 한다 — 목록을 더 스크롤한 것이
 * 지도 마커를 다시 불러오게 만들면 안 된다.
 *
 * ## 경계 중복 제거
 *
 * 커서 페이지네이션에서 경계 항목이 두 번 오면 FlatList 가 key 중복으로 경고한다.
 * 레시피 목록 훅과 같은 방식으로 `Set` 으로 걸러 낸다.
 */

import { useCallback, useMemo } from "react"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type {
  EmptyReason,
  FilterState,
  LatLng,
  MapBounds,
  RestaurantCardDto,
} from "../types"
import { classifyFetchFailure, totalExcluded } from "../utils/fetchError"
import { effectiveSort } from "../utils/requestGuards"
import { filtersKey, restaurantKeys } from "./restaurantQueryKeys"
import { resolveEmptyReason } from "./useMapSearch"

/** 한 페이지 크기. 카드가 사진 3장을 물고 있어 20개면 이미지 60장이다 — 그 이상은 무겁다. */
export const RESTAURANT_LIST_PAGE_SIZE = 20

export interface UseRestaurantListParams {
  filters: FilterState
  userLocation: LatLng | null
  /**
   * 뷰포트를 함께 보내면 "지금 보이는 지역" 으로 좁힌다. 리스트 전용 모드(지도 없음)에서는
   * `null` 로 두고 지역 필터·검색어만으로 찾는다.
   */
  bounds?: MapBounds | null
  enabled?: boolean
}

export interface UseRestaurantListResult {
  items: RestaurantCardDto[]
  /** 서버가 셀 수 있을 때만 숫자. `null` 이면 화면은 "N개 이상" 으로 내려간다. */
  total: number | null
  /** 서버의 축별 객체를 합산한 값. 응답 필드를 그대로 내주지 않는다(합산 이유는 훅 본문). */
  excludedForMissingData: number
  profileMissing: boolean
  /** 서버가 실제로 거리를 계산했는가. `거리순` 정렬·거리 줄의 근거다. */
  distanceAvailable: boolean
  isLoading: boolean
  isRefetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  isError: boolean
  error: unknown
  emptyReason: EmptyReason | null
  loadMore: () => void
  refetch: () => void
}

export function useRestaurantList({
  filters,
  userLocation,
  bounds = null,
  enabled = true,
}: UseRestaurantListParams): UseRestaurantListResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  const filterKey = useMemo(() => filtersKey(filters), [filters])
  // bbox 는 있을 때만 키에 들어간다. 리스트 전용 모드에서 지도 팬이 목록을 흔들지 않게.
  const boundsKey = bounds
    ? `${bounds.swLat},${bounds.swLng},${bounds.neLat},${bounds.neLng}`
    : ""

  const infinite = useInfiniteQuery({
    queryKey: [
      ...restaurantKeys.list(language, filterKey, userLocation !== null),
      boundsKey,
    ],
    enabled,
    /*
      **줌·팬으로 키가 바뀌어도 이전 목록을 화면에 둔다.**

      bbox 가 키에 들어 있으므로 확대할 때마다 새 키가 되고, 그때마다 시트가 통째로
      스켈레톤이 됐다. 지도 쪽(`useMapSearch`)은 이미 같은 옵션을 쓰고 있어서 마커는
      남아 있는데 목록만 비는, 한 화면 안에서 서로 다른 두 규칙이었다. 네이버·카카오는
      새 결과가 도착할 때까지 이전 목록을 보여 준다.
    */
    placeholderData: keepPreviousData,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      restaurantService.fetchList(
        {
          cursor: pageParam,
          limit: RESTAURANT_LIST_PAGE_SIZE,
          swLat: bounds?.swLat,
          swLng: bounds?.swLng,
          neLat: bounds?.neLat,
          neLng: bounds?.neLng,
          userLat: userLocation?.lat ?? null,
          userLng: userLocation?.lng ?? null,
          cuisineTypes: filters.cuisineTypes,
          nutritionTags: filters.nutritionTags,
          regionGroups: filters.regionGroups,
          regionSidos: filters.regionSidos,
          q: filters.query,
          /* 좌표 없는 `거리순` 은 400 이다(`query.userLat missing`, 실측). 리스트 화면은
             딥링크 파라미터로 정렬을 받으므로 이 경로가 특히 쉽게 열린다 —
             `?sort=DISTANCE` 링크를 위치 권한 없이 열면 첫 페이지가 통째로 실패했다.
             근거와 규칙은 `utils/requestGuards.effectiveSort`. */
          sort: effectiveSort(filters.sort, userLocation !== null),
          bookmarkedOnly: filters.bookmarkedOnly,
          openNow: filters.openNow,
        },
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  const pages = infinite.data?.pages

  const items = useMemo<RestaurantCardDto[]>(() => {
    if (!pages) return []
    const seen = new Set<number>()
    const merged: RestaurantCardDto[] = []
    for (const page of pages) {
      for (const card of page.items) {
        if (seen.has(card.restaurantId)) continue
        seen.add(card.restaurantId)
        merged.push(card)
      }
    }
    return merged
  }, [pages])

  const emptyReason = useMemo<EmptyReason | null>(() => {
    // 400(우리 요청 결함)·5xx·모양 불일치를 "인터넷 확인" 으로 뭉개지 않는다.
    // 분류 규칙과 로그는 `classifyFetchFailure` 한 곳에 있다. `null` 은 실패가
    // 아니라는 뜻이다(취소된 질의) — 빈 상태를 그리지 않고 이전 목록을 남긴다.
    if (infinite.isError) return classifyFetchFailure(infinite.error, "list")
    if (!pages || items.length > 0) return null
    return resolveEmptyReason(filters)
  }, [infinite.isError, infinite.error, pages, items.length, filters])

  /*
    `enabled` 가 꺼져 있어도 `refetch()` 는 실행된다(기전은 `useMapSearch` 의 같은
    주석). 여기서는 그게 **조용한 쪽이라 더 나쁘다** — 지도가 뷰포트를 확정하기 전에는
    `bounds` 가 `null` 이고, bbox 도 지역 필터도 없는 요청은 서버에서 **전국**이 된다.
    그 요청은 실패하지 않고 **성공해서** 엉뚱한 카드로 목록을 채운다. 위 `enabled` 가
    막으려던 바로 그 한 발이라, 재시도가 그 가드를 우회하면 가드가 없는 것과 같다.
  */
  const refetch = useCallback(() => {
    if (!enabled) return
    void infinite.refetch()
  }, [enabled, infinite])

  const loadMore = useCallback(() => {
    if (infinite.hasNextPage && !infinite.isFetchingNextPage) {
      void infinite.fetchNextPage()
    }
  }, [infinite])

  return {
    items,
    total: pages?.[0]?.total ?? null,
    // 서버는 `{nutritionTags: 3}` 객체를 준다. 숫자로 읽으면 `> 0` 이 항상 false 가 되어
    // "영양 정보가 아직 없는 N곳은 빠졌어요" 안내가 조용히 사라진다.
    excludedForMissingData: totalExcluded(pages?.[0]?.excludedForMissingData),
    profileMissing: pages?.[0]?.profileMissing ?? false,
    distanceAvailable: pages?.[0]?.distanceAvailable ?? false,
    isLoading: infinite.isLoading,
    isRefetching: infinite.isRefetching,
    isFetchingNextPage: infinite.isFetchingNextPage,
    hasNextPage: infinite.hasNextPage === true,
    isError: infinite.isError,
    error: infinite.error,
    emptyReason,
    loadMore,
    refetch,
  }
}

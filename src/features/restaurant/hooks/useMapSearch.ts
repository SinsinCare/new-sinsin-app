/**
 * 뷰포트(bbox) 기반 지도 검색.
 *
 * ## 팬은 버튼, **줌은 자동** (2026-07-31 개정)
 *
 * 앞 판본은 "어떤 움직임이든 자동 재조회를 하지 않는다" 였다. 팬에 대해서는 그 근거가
 * 옳다 — 미는 동안 목록이 계속 갈리고 스크롤이 튀며, 팬 한 번에 요청이 여러 발 나간다.
 * 네이버 지도 · 카카오맵 · 구글 지도가 전부 `이 지역 검색` 버튼을 쓰는 이유다.
 *
 * 그런데 **줌은 다른 동작이다.** 확대는 "같은 자리를 더 좁게 보겠다" 는 뜻이고, 그때
 * 결과가 그대로 남아 있으면 화면이 고장 난 것으로 읽힌다(확대했는데 화면 밖 가게가
 * 목록에 그대로 있다). 지도 앱들은 줌에서는 결과를 바로 갱신한다.
 *
 * 그래서 판단을 둘로 갈랐다: **줌이 바뀌면 자동으로 다시 찾고, 위치만 바뀌면 pill 을
 * 띄운다.** 규칙 자체는 `utils/viewportAction` 의 순수 함수에 있다(훅 안의 `if` 로 두면
 * 검증할 수 없고, 이건 조용히 틀리는 종류의 규칙이다).
 *
 * 요청 폭주 걱정은 두 겹으로 막혀 있다: 이 콜백은 지도의 `onIdle`(제스처가 멎은 뒤)에서만
 * 불리고, react-query 가 같은 키를 합치며 `signal` 로 이전 요청을 끊는다.
 *
 * ## in-flight 취소
 *
 * 그래도 사용자가 pill 을 연타할 수 있다. react-query 가 넘겨주는 `signal` 을 axios 에
 * 그대로 전달해 이전 요청을 끊는다. 끊지 않으면 늦게 도착한 이전 응답이 최신 마커를
 * 덮어써 **지도가 과거로 돌아간다**.
 *
 * ## 마지막 성공 결과를 버리지 않는다
 *
 * `placeholderData: keepPreviousData` 로 새 영역을 불러오는 동안 이전 마커를 유지한다.
 * 로딩마다 지도가 비면 깜빡임이 심하고, 오프라인에서는 화면이 완전히 빈다.
 *
 * ## 확정된 bbox 의 소유자는 이 훅 **하나**다
 *
 * `committedBounds` 를 밖으로 내주는 이유가 있다. 예전에는 화면이 `searchedBounds` 라는
 * 자기 state 를 따로 들고 목록 질의에 넘겼는데, 그 값은 WebView 가 준 **가공 전** 배정도
 * 실수였다. 그래서
 *
 * 1. 지도 키는 5자리로 라운딩된 값(`roundBounds`)이고 목록 키는 13번째 소수까지 살아 있어,
 *    같은 화면을 다시 봐도 지도는 캐시 히트인데 목록만 1페이지부터 다시 받았다
 *    (`utils/bboxKey.ts` 헤더가 바로 이 실패를 설명한다).
 * 2. `normalizeBounds` 도 건너뛰어, 뒤집힌 bbox 가 그대로 `/search` 로 나가 400 이 됐다.
 * 3. **면적 상한 검사를 통과하지 못한 검색도 목록에는 나갔다.** `searchThisArea()` 가
 *    거절해도 화면의 state 는 이미 갱신돼 있었기 때문이다. 결과는 최악의 조합 —
 *    pill 은 "지도를 확대해 주세요" 인데 시트는 "불러오지 못했어요" 라는 오류를 띄운다.
 *    D12 가 애써 구분한 두 빈 상태가 한 화면에서 서로를 부정한다.
 *
 * 그래서 관문을 하나로 모았다. `searchThisArea()` 는 **확정에 성공했는지 boolean 으로**
 * 답하고, 확정된 값은 `committedBounds` 하나에서만 나온다.
 */

import { useCallback, useMemo, useRef, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type {
  EmptyReason,
  FilterState,
  LatLng,
  MapBounds,
  MapClusterDto,
  MapMarkerDto,
} from "../types"
import { hasActiveFilter, hasUnbackedSelection } from "../data/filterCatalog"
import {
  bboxKey,
  isBboxTooLarge,
  normalizeBounds,
  roundBounds,
} from "../utils/bboxKey"
import { resolveViewportAction } from "../utils/viewportAction"
import { classifyFetchFailure, totalExcluded } from "../utils/fetchError"
import { clampZoom, effectiveSort } from "../utils/requestGuards"
import {
  MAP_STALE_TIME_MS,
  filtersKey,
  restaurantKeys,
} from "./restaurantQueryKeys"

export interface UseMapSearchParams {
  filters: FilterState
  /** 위치 권한이 허용됐을 때만 채운다. `null` 이면 서버가 거리를 계산하지 않는다. */
  userLocation: LatLng | null
  /** 지도 SDK 가 아직 준비되지 않았거나 리스트 모드로 내려갔으면 `false`. */
  enabled?: boolean
}

export interface UseMapSearchResult {
  markers: MapMarkerDto[]
  clusters: MapClusterDto[]
  mode: "MARKER" | "CLUSTER"
  total: number
  /** limit 에 걸려 잘렸다 → "지도를 확대해 보세요". */
  truncated: boolean
  /** 서버 상한에 닿았다 → 확대해도 줄지 않는다. 문구가 다르다. */
  limitReached: boolean
  /**
   * 태그 필터가 조용히 뺀 곳 수(`nutrition_tags IS NULL`). 서버 응답의 축별 객체를
   * 합산한 값이다 — 응답 필드를 그대로 내주면 화면이 다시 `> 0` 으로 비교한다.
   */
  excludedForMissingData: number
  /**
   * 서버가 실제로 거리를 계산했는가. `userLocation !== null` 과 같지 않다 —
   * 좌표를 보냈어도 서버가 거부하면 거리는 전부 `null` 이다. `거리순` 정렬 활성화 판단은
   * 이 값을 봐야 한다.
   */
  distanceAvailable: boolean
  profileMissing: boolean
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  /** 0건일 때 어떤 빈 상태를 그릴지. 0건이 아니면 `null`. */
  emptyReason: EmptyReason | null
  /** 지도가 마지막 검색 이후 움직였다 → pill 을 띄운다. */
  isDirty: boolean
  /** bbox 가 서버 상한(대각 200km)을 넘었다 → 요청을 보내지 않고 안내만 한다. */
  isViewportTooLarge: boolean
  /**
   * 마지막으로 **확정된** bbox. 정규화 + 5자리 라운딩이 끝난 값이다.
   * 목록 질의도 이 값을 써야 지도와 목록이 같은 상자를 본다(헤더 참고).
   */
  committedBounds: MapBounds | null
  /** 지도 `onIdle` 에서 호출. dirty 판정만 하고 질의는 보내지 않는다. */
  onViewportChange: (bounds: MapBounds, zoom: number) => void
  /**
   * `현재 지도에서 찾기`. 지금 뷰포트를 확정하고 질의를 보낸다.
   *
   * **확정했으면 `true`.** 뷰포트가 아직 없거나 면적 상한을 넘어 거절한 경우 `false` 다.
   * 호출부는 이 값으로 "이번 검색은 일어나지 않았다" 를 알고 분석 예약을 지운다.
   */
  searchThisArea: () => boolean
  refetch: () => void
}

export function useMapSearch({
  filters,
  userLocation,
  enabled = true,
}: UseMapSearchParams): UseMapSearchResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  /** 마지막으로 **확정된** 뷰포트. 질의는 이 값으로만 나간다. */
  const [committed, setCommitted] = useState<{
    bounds: MapBounds
    zoom: number
  } | null>(null)
  /** 지도가 지금 보고 있는 뷰포트. 확정 전이라 질의에 쓰이지 않는다. */
  const pendingRef = useRef<{ bounds: MapBounds; zoom: number } | null>(null)
  const [isDirty, setDirty] = useState(false)
  const [isViewportTooLarge, setViewportTooLarge] = useState(false)

  /**
   * 뷰포트를 확정하고 질의를 열어 준다. 자동(줌)·수동(pill) 두 경로가 **같은 관문**을
   * 지나야 면적 상한 검사가 한 곳에 남는다(헤더 §확정된 bbox 의 소유자).
   */
  const commitViewport = useCallback(
    (next: { bounds: MapBounds; zoom: number }): boolean => {
      if (isBboxTooLarge(next.bounds)) {
        // 서버가 400 을 줄 것이 확실하므로 요청을 아낀다. 화면은 "지도를 확대해 주세요" 를 띄운다.
        // 확정하지 않으므로 목록 질의의 bbox 도 그대로다 — 시트가 오류를 띄우지 않는다.
        setViewportTooLarge(true)
        return false
      }
      setCommitted(next)
      setDirty(false)
      return true
    },
    [],
  )

  const onViewportChange = useCallback(
    (bounds: MapBounds, zoom: number) => {
      const normalized = roundBounds(normalizeBounds(bounds))
      /* 줌은 **들어오는 자리에서** 정수 1~14 로 조인다. 여기서 조여야 dirty 비교·queryKey·
         분석 이벤트·요청이 모두 같은 값을 본다 — 요청 직전에만 조이면 `4.5` 와 `5` 가 서로
         다른 캐시 키를 만들면서 같은 응답을 받는다. */
      const level = clampZoom(zoom)
      const next = { bounds: normalized, zoom: level }
      pendingRef.current = next
      const tooLarge = isBboxTooLarge(normalized)
      setViewportTooLarge(tooLarge)

      /*
        무엇을 할지는 순수 규칙이 정한다(팬 → pill, 줌 → 자동 재검색, 같으면 아무것도).
        너무 넓은 화면에서는 자동으로 나가지 않는다 — 서버가 400 을 줄 것이 확실하고,
        그때 화면이 띄워야 하는 것은 결과가 아니라 "지도를 확대해 주세요" 다.
      */
      const action = resolveViewportAction(
        committed === null
          ? null
          : { bboxKey: bboxKey(committed.bounds), zoom: committed.zoom },
        { bboxKey: bboxKey(normalized), zoom: level },
      )

      if (action === "idle") {
        setDirty(false)
        return
      }
      if (action === "search" && !tooLarge) {
        commitViewport(next)
        return
      }
      setDirty(true)
    },
    [committed, commitViewport],
  )

  const searchThisArea = useCallback((): boolean => {
    const next = pendingRef.current
    if (!next) return false
    return commitViewport(next)
  }, [commitViewport])

  const filterKey = useMemo(() => filtersKey(filters), [filters])

  const query = useQuery({
    queryKey: committed
      ? restaurantKeys.map(
          language,
          committed.bounds,
          committed.zoom,
          filterKey,
          userLocation !== null,
        )
      : // 확정 전에는 실행되지 않으므로 키 값 자체는 의미가 없다. 다만 안정된 배열이어야 한다.
        [...restaurantKeys.map(language, ZERO_BOUNDS, 0, filterKey, false)],
    enabled: enabled && committed !== null,
    staleTime: MAP_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => {
      // `enabled` 가 보장하지만 타입을 좁히기 위한 가드다.
      if (!committed) throw new Error("viewport not committed")
      return restaurantService.fetchMap(
        {
          ...committed.bounds,
          zoom: committed.zoom,
          userLat: userLocation?.lat ?? null,
          userLng: userLocation?.lng ?? null,
          cuisineTypes: filters.cuisineTypes,
          nutritionTags: filters.nutritionTags,
          regionGroups: filters.regionGroups,
          regionSidos: filters.regionSidos,
          q: filters.query,
          /* 좌표가 없으면 `거리순` 을 보내지 않는다 — 서버는 그 조합에 400
             (`query.userLat missing`)을 낸다. `sanitizeSortForLocation` 이 화면 상태를
             되돌리지만 그건 이펙트라 한 렌더 늦고, 딥링크 `?sort=DISTANCE` 나 AI 검색이
             돌려준 `DISTANCE` 는 그 한 렌더에 요청을 한 발 내보낸다. 질의에 쓸 값을
             여기서 직접 고르면 그 한 발이 사라진다.
             queryKey 는 `filterKey`(원래 정렬) + `userLocation !== null` 을 모두 담고 있어
             효과 정렬은 두 값의 함수다 — 키가 모호해지지 않는다. */
          sort: effectiveSort(filters.sort, userLocation !== null),
          bookmarkedOnly: filters.bookmarkedOnly,
          openNow: filters.openNow,
        },
        signal,
      )
    },
  })

  const data = query.data
  const total = data?.total ?? 0

  const emptyReason = useMemo<EmptyReason | null>(() => {
    // 실패는 원인별로 나눈다. 400 을 "인터넷 확인" 으로 말하던 결함의 수정이고,
    // 분류와 로그는 `classifyFetchFailure` 한 곳에 있다.
    if (query.isError) return classifyFetchFailure(query.error, "map")
    if (!data || total > 0) return null
    return resolveEmptyReason(filters)
  }, [query.isError, query.error, data, total, filters])

  return {
    markers: data?.markers ?? [],
    clusters: data?.clusters ?? [],
    mode: data?.mode ?? "MARKER",
    total,
    truncated: data?.truncated ?? false,
    limitReached: data?.limitReached ?? false,
    // 서버는 축별 객체(`{nutritionTags: 3}`)를 준다. 숫자로 읽으면 `> 0` 비교가
    // 항상 false 가 되어 "N곳은 빠졌어요" 안내가 조용히 사라진다.
    excludedForMissingData: totalExcluded(data?.excludedForMissingData),
    distanceAvailable: data?.distanceAvailable ?? false,
    profileMissing: data?.profileMissing ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    emptyReason,
    isDirty,
    isViewportTooLarge,
    committedBounds: committed?.bounds ?? null,
    onViewportChange,
    searchThisArea,
    refetch: query.refetch,
  }
}

const ZERO_BOUNDS: MapBounds = { swLat: 0, swLng: 0, neLat: 0, neLng: 0 }

/**
 * 0건의 이유를 고른다. 시드 데이터가 강남 한 블록뿐이라 이 구분이 없으면
 * 전부 "오류" 로 보이고, 반대로 전부 "데이터 없음" 으로 보이면 필터를 되돌릴 생각을 못 한다.
 *
 * 필터가 하나라도 걸려 있으면 필터를 먼저 의심한다 — 사용자가 방금 한 행동이 그것이므로
 * 되돌릴 수 있는 원인을 먼저 말하는 것이 맞다. `저당`·`샐러드` 처럼 오늘 데이터가 없는
 * 칩이 섞여 있으면 특히 그렇다.
 */
export function resolveEmptyReason(filters: FilterState): EmptyReason {
  if (hasActiveFilter(filters) || hasUnbackedSelection(filters)) {
    return "FILTERED_TO_ZERO"
  }
  return "NO_DATA_HERE"
}

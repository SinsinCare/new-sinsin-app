/**
 * react-query 키 팩토리. 식당 도메인의 모든 키가 여기서만 만들어진다.
 *
 * ## 왜 한 곳에 모으나
 *
 * 북마크 낙관 갱신은 **네 캐시를 동시에 고쳐야** 한다 — 지도 마커, 목록 카드, 상세,
 * 저장 목록. 키를 각 훅이 따로 조립하면 그중 하나가 어긋나고, 하트만 반쯤 켜진 화면이 남는다.
 * `usePostDetail` 의 like/bookmark 가 상세와 목록 캐시를 함께 갱신하는 이유와 같다.
 *
 * ## 로케일이 키에 들어간다
 *
 * `apiClient` 는 현재 앱 언어를 `Accept-Language` 로 보낸다. 식당 응답은 표시용
 * 음식 종류·영업 상태 문구가 언어에 따라 달라질 수 있으므로 로케일을 키에 넣는다.
 * 로케일을 뺐다가 서버 리포트가 중복 생성된 전례가 있다(`src/i18n/index.ts` 참고).
 *
 * ## bbox 는 라운딩해서 넣는다
 *
 * `bboxKey()` 가 소수 5자리로 끊는다. 손가락이 1픽셀 스친 것으로 캐시가 갈리지 않게.
 *
 * ## 사용자 위치도 라운딩해서 넣는다
 *
 * 카드의 `distanceKm` 은 서버가 요청의 `userLat/userLng` 로 계산한다. 그래서 위치는
 * 응답의 일부이고 키에 있어야 한다. 예전에는 `hasUserLocation: boolean` 만 넣었는데,
 * 진입 절차가 **마지막 좌표를 먼저 깔고 정확한 픽스로 덮어쓰는** 구조라(`useMyLocation`)
 * 두 좌표가 같은 키를 만들어 — 낡은 좌표로 계산된 거리가 캐시 수명(gcTime) 내내 남았다.
 * `userLocationKey()` 가 소수 3자리(≈100m)로 끊는다: 그보다 작은 이동은 거리 표기
 * (`620m`, 10m 눈금·`2.6km`)에서 어차피 구별되지 않고, GPS 잡음마다 키가 갈리면 같은
 * 화면을 계속 다시 받는다.
 */

import type { Language } from "@/src/i18n"

import type {
  CuisineType,
  LatLng,
  MapBounds,
  NutritionTag,
  PhotoCategory,
  ReviewSortOption,
  SortOption,
} from "../types"
import { bboxKey } from "../utils/bboxKey"

/** 소수 3자리 ≈ 111m(위도). 거리 표기의 눈금보다 굵지 않으면서 GPS 잡음은 흡수한다. */
const LOCATION_KEY_FACTOR = 10 ** 3

/**
 * 사용자 위치 → 키 조각. 없으면 빈 문자열 — 예전의 `hasUserLocation: false` 와 같은 뜻이다.
 * `+ 0` 은 `-0` 이 `"-0"` 으로 직렬화돼 키가 갈리는 것을 막는다(`bboxKey.roundCoord` 와 같다).
 */
export function userLocationKey(location: LatLng | null): string {
  if (location === null) return ""
  const round = (value: number) =>
    Math.round(value * LOCATION_KEY_FACTOR) / LOCATION_KEY_FACTOR + 0
  return `${round(location.lat)},${round(location.lng)}`
}

/** 도메인 루트. `invalidateQueries({ queryKey: RESTAURANT_KEY })` 로 전체를 털 수 있다. */
export const RESTAURANT_KEY = ["restaurant"] as const

/** 지도 응답 전체(모든 bbox·필터 조합). 북마크 토글 후 이 접두어로 무효화한다. */
export const RESTAURANT_MAP_KEY = ["restaurant", "map"] as const
export const RESTAURANT_LIST_KEY = ["restaurant", "list"] as const
export const RESTAURANT_BOOKMARKS_KEY = ["restaurant", "bookmarks"] as const

/**
 * 필터를 키 조각 하나로 접는다. 배열을 그대로 키에 넣으면 순서만 달라도 캐시가 갈리므로
 * **정렬해서** 문자열로 만든다 — 사용자가 `한식→중식` 순으로 골랐든 반대로 골랐든 같은 질의다.
 */
export function filtersKey(filters: {
  cuisineTypes?: readonly CuisineType[]
  nutritionTags?: readonly NutritionTag[]
  regionGroups?: readonly string[]
  regionSidos?: readonly string[]
  sort?: SortOption
  openNow?: boolean
  bookmarkedOnly?: boolean
  query?: string
}): string {
  const parts = [
    [...(filters.cuisineTypes ?? [])].sort().join("|"),
    [...(filters.nutritionTags ?? [])].sort().join("|"),
    [...(filters.regionGroups ?? [])].sort().join("|"),
    [...(filters.regionSidos ?? [])].sort().join("|"),
    filters.sort ?? "",
    filters.openNow ? "openNow" : "",
    filters.bookmarkedOnly ? "bookmarked" : "",
    (filters.query ?? "").trim(),
  ]
  return parts.join("/")
}

export const restaurantKeys = {
  map: (
    language: Language,
    bounds: MapBounds,
    zoom: number,
    filters: string,
    /** 위치가 있으면 서버가 거리를 계산해 응답이 달라진다 → 라운딩해서 키에 넣는다(헤더). */
    userLocation: LatLng | null,
  ) =>
    [
      ...RESTAURANT_MAP_KEY,
      "places-v1",
      language,
      bboxKey(bounds),
      zoom,
      filters,
      userLocationKey(userLocation),
    ] as const,

  list: (language: Language, filters: string, userLocation: LatLng | null) =>
    [
      ...RESTAURANT_LIST_KEY,
      language,
      filters,
      userLocationKey(userLocation),
    ] as const,

  detail: (language: Language, restaurantId: number) =>
    [...RESTAURANT_KEY, "detail", language, restaurantId] as const,

  menus: (language: Language, restaurantId: number) =>
    [...RESTAURANT_KEY, "menus", language, restaurantId] as const,

  hours: (language: Language, restaurantId: number) =>
    [...RESTAURANT_KEY, "hours", language, restaurantId] as const,

  photos: (
    language: Language,
    restaurantId: number,
    category: PhotoCategory | "ALL",
  ) => [...RESTAURANT_KEY, "photos", language, restaurantId, category] as const,

  reviews: (
    language: Language,
    restaurantId: number,
    sort: ReviewSortOption,
    keyword: string | null,
    menuName: string | null,
  ) =>
    [
      ...RESTAURANT_KEY,
      "reviews",
      language,
      restaurantId,
      sort,
      keyword ?? "",
      menuName ?? "",
    ] as const,

  reviewer: (language: Language, reviewerId: number, sort: ReviewSortOption) =>
    [...RESTAURANT_KEY, "reviewer", language, reviewerId, sort] as const,

  bookmarks: (language: Language) =>
    [...RESTAURANT_BOOKMARKS_KEY, language] as const,

  regions: (language: Language) =>
    [...RESTAURANT_KEY, "regions", language] as const,

  suggest: (language: Language, q: string) =>
    [...RESTAURANT_KEY, "suggest", language, q] as const,
}

/**
 * 캐시 신선도.
 *
 * 지도 60초: 사용자가 왕복하며 같은 영역을 여러 번 본다. 그동안 식당이 새로 생기지 않는다.
 * 상세 5분: 영업 상태는 `nextTransitionAt` 로컬 타이머가 갱신하므로 더 자주 받을 이유가 없다.
 */
export const MAP_STALE_TIME_MS = 60 * 1000
export const DETAIL_STALE_TIME_MS = 5 * 60 * 1000

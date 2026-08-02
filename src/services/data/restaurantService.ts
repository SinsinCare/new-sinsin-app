/**
 * 식당 도메인 네트워크 계약. `BUILD_CONTRACT §2` 의 엔드포인트 전량.
 *
 * ## 이 파일의 타입이 왜 다시 쓰였나
 *
 * 이전 버전은 **API 와 어긋나 있었다.** `RestaurantMenusResult` 가
 * `address`/`lat`/`lng`/`phone` 을 선언했는데 백엔드는 그 필드를 주지 않고,
 * 반대로 백엔드가 주는 `description`/`imageUrl`/`isSignature` 는 선언이 없었다.
 * `NearbyRestaurantItem` 도 `imageUrls`/`nutritionTags`/`businessStatus` 를 빼먹었다.
 * 타입이 있으니 컴파일은 통과하고 런타임에 `undefined` 가 화면에 꽂혔다 —
 * 카드 사진이 비어 보이던 원인이 이 두 줄이다. 새 응답 타입은 전부
 * `src/features/restaurant/types` 에 있고, 이 파일은 **경로와 파라미터 조립만** 맡는다.
 * (쓰이지 않던 `RestaurantMenusResult`/`RestaurantMenuItem` 은 지웠다. 그 이름을
 *  import 하는 곳은 없었고, 남겨 두면 다음 사람이 또 믿는다.)
 *
 * ## 페이지네이션 방언 — 하나만 쓴다
 *
 * 저장소에는 커서 방언이 두 개 있다: `http/pagination.ts` 의 `Keyset{at,id}` +
 * `X-Next-Cursor` **헤더**(커뮤니티·채팅), 그리고 도메인별 **body `nextCursor`**(레시피).
 * 식당 도메인은 **body `nextCursor`** 를 쓴다 — 응답 본문만 보면 다음 페이지를 알 수 있어
 * react-query `getNextPageParam` 이 헤더를 들여다볼 필요가 없다. 두 방언을 섞지 말 것.
 *
 * ## 이동 중 요청 취소
 *
 * 지도·목록 질의는 `AbortSignal` 을 받는다. 취소하지 않으면 늦게 도착한 이전 응답이
 * 최신 화면을 덮어써 마커가 과거로 돌아간다.
 */

import type { AxiosRequestConfig } from "axios"

import { api } from "../core"
import {
  BOOKMARK_CARD_KEYS,
  BOOKMARK_LIST_KEYS,
  BOOKMARK_TOGGLE_KEYS,
  CARD_KEYS,
  DETAIL_KEYS,
  HOURS_KEYS,
  HOURS_TODAY_KEYS,
  LIST_KEYS,
  MAP_CLUSTER_KEYS,
  MAP_KEYS,
  MAP_MARKER_KEYS,
  MENUS_KEYS,
  MENU_KEYS,
  PHOTOS_KEYS,
  PHOTO_KEYS,
  REGION_KEYS,
  REGION_SIDO_KEYS,
  REVIEWER_KEYS,
  REVIEWS_KEYS,
  REVIEW_CREATE_KEYS,
  REVIEW_ITEM_KEYS,
  SUGGESTION_KEYS,
  SUGGEST_KEYS,
  requireItemShape,
  requireShape,
} from "./restaurantShape"
/* 요청 관문. **파라미터 조립과 같은 파일에 있어야 한다** — 훅에만 두면 다음 호출부가
   서비스를 직접 불러 400 을 다시 만든다(그게 지금 고치는 결함의 모양이다). */
import {
  assertSortHasAnchor,
  assertViewportWithinCap,
  clampZoom,
} from "@/src/features/restaurant/utils/requestGuards"
import type {
  AiSearchResult,
  BookmarkListResponse,
  BookmarkToggleResponse,
  CuisineType,
  MapSearchResponse,
  NutritionTag,
  PhotoCategory,
  RegionFacetResponse,
  RestaurantDetailDto,
  RestaurantHoursResponse,
  RestaurantListResponse,
  RestaurantMenusResponse,
  RestaurantPhotosResponse,
  RestaurantReviewsResponse,
  ReviewDto,
  ReviewReportPayload,
  ReviewSortOption,
  ReviewSubmitPayload,
  ReviewerProfileResponse,
  SearchSuggestResponse,
  SortOption,
} from "@/src/features/restaurant/types"

/* ────────────────────────── 레거시 경로 (지우지 않는다) ────────────────────────── */

/**
 * `GET /restaurants/nearby` 응답. 새 지도 화면은 `/map`+`/search` 를 쓰지만
 * `app/(tabs)/restaurant.tsx` 와 `tests/restaurantI18n.test.ts` 가 아직 이 경로를 쓴다.
 * **누락돼 있던 필드를 채웠다** — 백엔드 `cardPayload` 가 실제로 주는 값들이다.
 */
export interface NearbyRestaurantItem {
  restaurantId: number
  name: string
  branch?: string | null
  address?: string | null
  shortAddress?: string | null
  lat: number
  lng: number
  phone: string | null
  cuisineType: string
  distanceKm: number
  menuCount: number
  safeMenuCount: number
  cautionMenuCount: number
  highRiskMenuCount: number
  avgRiskLevel: string
  /** 376행 전부 채워져 있다. 화면에서 `[]` 로 덮어쓰지 말 것. */
  imageUrls?: string[]
  nutritionTags?: string[]
  rating?: number | null
  reviewCount?: number
  avgPrice?: number | null
  businessStatus?: string | null
  openTime?: string | null
  closeTime?: string | null
  /** 실측: 이 컬럼은 NULL 이 아니라 `''`(빈 문자열)이다. `=== null` 검사는 틀린다. */
  closedDay?: string | null
}

/* ────────────────────────── 쿼리 파라미터 조립 ────────────────────────── */

/**
 * CSV 파라미터. 빈 배열은 **키를 아예 보내지 않는다** — 백엔드 `csv()` 도 빈 문자열을
 * "필터 없음" 으로 보지만, 보내지 않는 편이 캐시 키와 로그를 깨끗하게 유지한다.
 */
function csvParam(values: readonly string[] | undefined): string | undefined {
  if (!values || values.length === 0) return undefined
  return values.join(",")
}

export interface MapSearchQuery {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
  /** 카카오 level. **작을수록 확대**다. 마커/클러스터 모드 판정은 서버가 한다. */
  zoom: number
  userLat?: number | null
  userLng?: number | null
  cuisineTypes?: readonly CuisineType[]
  nutritionTags?: readonly NutritionTag[]
  /** `<sido>-<slug>` 그룹 키. bbox 와 AND 로 걸린다. */
  regionGroups?: readonly string[]
  /** `<sido>-all` 을 고른 경우. 서버가 `region_sido` 로 번역한다. */
  regionSidos?: readonly string[]
  q?: string
  sort?: SortOption
  bookmarkedOnly?: boolean
  openNow?: boolean
  limit?: number
}

export interface RestaurantListQuery extends Omit<
  MapSearchQuery,
  "zoom" | "swLat" | "swLng" | "neLat" | "neLng"
> {
  /** 리스트 모드는 bbox 없이도 동작한다(지역 필터·검색어만으로). */
  swLat?: number
  swLng?: number
  neLat?: number
  neLng?: number
  cursor?: string
}

function filterParams(
  query: MapSearchQuery | RestaurantListQuery,
): Record<string, unknown> {
  return {
    userLat: query.userLat ?? undefined,
    userLng: query.userLng ?? undefined,
    cuisineTypes: csvParam(query.cuisineTypes),
    nutritionTags: csvParam(query.nutritionTags),
    regionGroups: csvParam(query.regionGroups),
    regionSidos: csvParam(query.regionSidos),
    q: query.q?.trim() ? query.q.trim() : undefined,
    sort: query.sort,
    // `false` 는 보내지 않는다 — 기본값이고, 보내면 캐시 키만 늘어난다.
    bookmarkedOnly: query.bookmarkedOnly ? true : undefined,
    openNow: query.openNow ? true : undefined,
    limit: query.limit,
  }
}

/* ────────────────────────── 서비스 ────────────────────────── */

export const restaurantService = {
  /**
   * `GET /restaurants/nearby` — 레거시 반경 검색.
   * **파라미터 모양을 바꾸지 말 것.** `tests/restaurantI18n.test.ts` 가 이 호출을
   * 정확히 단언하고, 파이썬 서버와의 parity 대상이다.
   */
  async fetchNearby(
    lat: number,
    lng: number,
    radius = 2000,
    cuisineTypes: string[] = [],
    nutritionTags: string[] = [],
  ): Promise<NearbyRestaurantItem[]> {
    const response = await api.get("/restaurants/nearby", {
      params: {
        lat,
        lng,
        radius,
        cuisineTypes:
          cuisineTypes.length > 0 ? cuisineTypes.join(",") : undefined,
        nutritionTags:
          nutritionTags.length > 0 ? nutritionTags.join(",") : undefined,
      },
    })
    return response.data.result as NearbyRestaurantItem[]
  },

  /**
   * E1 `GET /restaurants/map` — 뷰포트 검색. 지도의 심장.
   * 응답의 `truncated`/`limitReached` 를 화면이 반드시 읽어야 한다 — 조용한 절단 금지.
   */
  async fetchMap(
    query: MapSearchQuery,
    signal?: AbortSignal,
  ): Promise<MapSearchResponse> {
    /* 서버가 거절할 것이 확실한 요청은 보내지 않는다(`utils/requestGuards` 머리말의 실측 표).
       면적·거리순은 값을 바꾸지 않고 던지고, `zoom` 만 정수 1~14 로 조인다. */
    const bounds = {
      swLat: query.swLat,
      swLng: query.swLng,
      neLat: query.neLat,
      neLng: query.neLng,
    }
    assertViewportWithinCap(bounds, "GET /restaurants/map")
    assertSortHasAnchor(
      query.sort,
      query.userLat != null && query.userLng != null
        ? { lat: query.userLat, lng: query.userLng }
        : null,
      "GET /restaurants/map",
    )
    const config: AxiosRequestConfig = {
      params: {
        ...bounds,
        // 실측: `zoom=4.5` → 400 int_parsing, `0` → greater_than_equal, `15` → less_than_equal.
        // 카카오가 정수를 주더라도 그 사실에 기대지 않는다 — 이 한 줄이 그 400 을 불가능하게 한다.
        zoom: clampZoom(query.zoom),
        ...filterParams(query),
      },
      signal,
    }
    const response = await api.get("/restaurants/map", config)
    // 마커·클러스터는 모드에 따라 한쪽이 비지만, 있는 쪽 항목의 키는 반드시 있어야 한다.
    const result = requireShape<MapSearchResponse>(
      response.data.result,
      "GET /restaurants/map",
      MAP_KEYS,
    )
    requireItemShape(result.markers, "GET /restaurants/map", MAP_MARKER_KEYS)
    requireItemShape(result.clusters, "GET /restaurants/map", MAP_CLUSTER_KEYS)
    return result
  },

  /** E2 `GET /restaurants/search` — 리스트 모드(커서). */
  async fetchList(
    query: RestaurantListQuery,
    signal?: AbortSignal,
  ): Promise<RestaurantListResponse> {
    /* bbox 는 **선택**이다. 넷 다 없으면 서버는 조건(지역·검색어)만으로 전국을 찾는다 —
       실측으로 200 이다(`?sort=RECOMMENDED&limit=20` → 200, 강남 376곳 중 첫 20개).
       그래서 지도가 죽었을 때 bbox 없이 보내는 것은 결함이 아니다. 넷 중 일부만 보내는 것은
       서버가 400(`query.neLat missing`)을 내지만, `useRestaurantList` 가 항상 넷을 함께
       넣거나 함께 뺀다. 넷이 다 있을 때만 면적 상한을 본다. */
    if (
      query.swLat !== undefined &&
      query.swLng !== undefined &&
      query.neLat !== undefined &&
      query.neLng !== undefined
    ) {
      assertViewportWithinCap(
        {
          swLat: query.swLat,
          swLng: query.swLng,
          neLat: query.neLat,
          neLng: query.neLng,
        },
        "GET /restaurants/search",
      )
    }
    // 실측: `?sort=DISTANCE&limit=20` → 400 `query.userLat missing`. 좌표 없는 거리순은
    // 나갈 수 없다(정상 경로는 `effectiveSort` 가 이미 추천순으로 되돌린다).
    assertSortHasAnchor(
      query.sort,
      query.userLat != null && query.userLng != null
        ? { lat: query.userLat, lng: query.userLng }
        : null,
      "GET /restaurants/search",
    )
    const response = await api.get("/restaurants/search", {
      params: {
        swLat: query.swLat,
        swLng: query.swLng,
        neLat: query.neLat,
        neLng: query.neLng,
        cursor: query.cursor,
        ...filterParams(query),
      },
      signal,
    })
    const result = requireShape<RestaurantListResponse>(
      response.data.result,
      "GET /restaurants/search",
      LIST_KEYS,
    )
    // `safety` 가 이 검사의 존재 이유다 — 없으면 카드가 근거 없이 그려진다.
    requireItemShape(result.items, "GET /restaurants/search", CARD_KEYS)
    return result
  },

  /**
   * E3 `GET /restaurants/search/suggest` — 자동완성.
   * `REGION` 제안은 좌표를 함께 주므로 별도 지오코딩 라이브러리가 필요 없다.
   */
  async fetchSuggestions(
    q: string,
    signal?: AbortSignal,
  ): Promise<SearchSuggestResponse> {
    const response = await api.get("/restaurants/search/suggest", {
      params: { q },
      signal,
    })
    const result = requireShape<SearchSuggestResponse>(
      response.data.result,
      "GET /restaurants/search/suggest",
      SUGGEST_KEYS,
    )
    // `type`·`label` 만 필수다. `lat`/`restaurantId`/`key`/`count` 는 해당 없는 종류에서
    // 서버가 **키를 지운다** — 필수로 걸면 지역 제안마다 죽는다(`SearchSuggestionDto` 헤더).
    requireItemShape(
      result.suggestions,
      "GET /restaurants/search/suggest",
      SUGGESTION_KEYS,
    )
    return result
  },

  /**
   * E4 `POST /restaurants/ai-search` — 자연어 → 구조화 필터.
   * 서버는 실패·타임아웃에도 200 을 주고 `fallback: true` 로 표시한다.
   * 화면은 그 사실을 숨기지 않는다("AI 없이 검색어로 찾았어요").
   */
  async aiSearch(
    payload: {
      query: string
      viewport?: {
        swLat: number
        swLng: number
        neLat: number
        neLng: number
      } | null
      userLat?: number | null
      userLng?: number | null
    },
    signal?: AbortSignal,
  ): Promise<AiSearchResult> {
    const response = await api.post("/restaurants/ai-search", payload, {
      signal,
    })
    return response.data.result as AiSearchResult
  },

  /** E5 `GET /restaurants/regions` — 지역 facet 트리(칩에 실제 개수를 붙이기 위한 것). */
  async fetchRegions(): Promise<RegionFacetResponse> {
    const response = await api.get("/restaurants/regions")
    const result = requireShape<RegionFacetResponse>(
      response.data.result,
      "GET /restaurants/regions",
      REGION_KEYS,
    )
    // `labelKey` 가 없으면 칩이 빈 글자가 된다(서버가 표시 문구를 보내지 않으므로
    // 폴백할 곳이 아예 없다). `sidos` 만 보면 충분하다 — `groups` 는 같은 조립 함수가 만든다.
    requireItemShape(result.sidos, "GET /restaurants/regions", REGION_SIDO_KEYS)
    return result
  },

  /**
   * E6 `GET /restaurants/bookmarks` — 저장한 곳(커서).
   *
   * **응답 카드는 `/search` 카드와 모양이 다르다**(`BookmarkCardDto`). 그래서 검사도
   * `CARD_KEYS` 가 아니라 `BOOKMARK_CARD_KEYS` 를 쓴다 — 여기에 `safety` 를 요구하면
   * 이 목록은 항상 죽는다(서버가 개인화 배지 로더를 주입하지 않았고, 그건 의도된 상태다).
   */
  async fetchBookmarks(cursor?: string): Promise<BookmarkListResponse> {
    const response = await api.get("/restaurants/bookmarks", {
      params: { cursor },
    })
    const result = requireShape<BookmarkListResponse>(
      response.data.result,
      "GET /restaurants/bookmarks",
      BOOKMARK_LIST_KEYS,
    )
    requireItemShape(
      result.items,
      "GET /restaurants/bookmarks",
      BOOKMARK_CARD_KEYS,
    )
    return result
  },

  /**
   * E7 `PUT /restaurants/:id/bookmark` — 저장.
   * 응답의 `bookmarked` 는 서버가 **다시 읽은** 최종 상태다. 멱등이라 연타해도 안전하다.
   */
  async addBookmark(restaurantId: number): Promise<BookmarkToggleResponse> {
    const response = await api.put(`/restaurants/${restaurantId}/bookmark`)
    // 이 두 키는 낙관 갱신을 **되돌리는** 근거다. 없으면 `undefined` 로 네 캐시를
    // 덮어써 하트가 전부 꺼진다 — 조용히 넘기면 안 되는 자리다.
    return requireShape<BookmarkToggleResponse>(
      response.data.result,
      "PUT /restaurants/:id/bookmark",
      BOOKMARK_TOGGLE_KEYS,
    )
  },

  /** E7 `DELETE /restaurants/:id/bookmark` — 저장 해제. 역시 멱등이다. */
  async removeBookmark(restaurantId: number): Promise<BookmarkToggleResponse> {
    const response = await api.delete(`/restaurants/${restaurantId}/bookmark`)
    return requireShape<BookmarkToggleResponse>(
      response.data.result,
      "DELETE /restaurants/:id/bookmark",
      BOOKMARK_TOGGLE_KEYS,
    )
  },

  /**
   * E8 `GET /restaurants/:id/hours` — 요일별 영업시간 + 다음 전환 시각.
   *
   * `today` 는 **객체**다. 앱이 이걸 요일 문자열로 알고 있었던 탓에 상세의 마감 시각이
   * 영원히 비고 영업 상태가 항상 `UNKNOWN` 이었다. 그래서 최상위와 `today` 를 따로 검사한다.
   */
  async fetchHours(restaurantId: number): Promise<RestaurantHoursResponse> {
    const response = await api.get(`/restaurants/${restaurantId}/hours`)
    const endpoint = "GET /restaurants/:id/hours"
    const result = requireShape<RestaurantHoursResponse>(
      response.data.result,
      endpoint,
      HOURS_KEYS,
    )
    requireShape(result.today, `${endpoint} 의 today`, HOURS_TODAY_KEYS)
    return result
  },

  /**
   * E9 `POST /restaurants/:id/reviews` — 후기 작성.
   *
   * 응답은 **후기 자체가 아니라 봉투**다: `{review, photosIndexed}`. 예전에는 그것을
   * 통째로 `ReviewDto` 로 캐스트해서, 등록이 성공했는데도 화면이 `result.rating` 을
   * 읽다 터졌다 — 성공 토스트가 뜬 직후 실패 토스트가 이어지는 증상이다. 캐스트는
   * 컴파일 타임에 아무것도 검사하지 않으므로 `requireShape` 로 실제 모양을 본다.
   *
   * `photosIndexed` 는 **`-1` 이 실패**다. 후기 본문은 저장됐는데 사진만 색인에
   * 실패한 상태라 등록 자체를 실패로 접으면 안 된다 — 사용자가 같은 글을 또 쓴다.
   */
  async createReview(
    restaurantId: number,
    payload: ReviewSubmitPayload,
  ): Promise<{ review: ReviewDto; photosIndexed: number }> {
    const response = await api.post(
      `/restaurants/${restaurantId}/reviews`,
      payload,
    )
    const result = requireShape<{ review: ReviewDto; photosIndexed: number }>(
      response.data.result,
      "POST /restaurants/:id/reviews",
      REVIEW_CREATE_KEYS,
    )
    requireShape(
      result.review,
      "POST /restaurants/:id/reviews",
      REVIEW_ITEM_KEYS,
    )
    return result
  },

  /**
   * E10 `GET /restaurants/:id/reviews` — 후기 목록(커서·정렬·필터).
   * 평점 분해·키워드 카운트가 같은 응답에 실려 온다(첫 페이지 값만 의미가 있다).
   */
  async fetchReviews(
    restaurantId: number,
    params: {
      cursor?: string
      sort?: ReviewSortOption
      keyword?: string
      menuName?: string
      limit?: number
    } = {},
    signal?: AbortSignal,
  ): Promise<RestaurantReviewsResponse> {
    const response = await api.get(`/restaurants/${restaurantId}/reviews`, {
      params: {
        cursor: params.cursor,
        sort: params.sort,
        keyword: params.keyword,
        menuName: params.menuName,
        limit: params.limit,
      },
      signal,
    })
    const endpoint = "GET /restaurants/:id/reviews"
    const result = requireShape<RestaurantReviewsResponse>(
      response.data.result,
      endpoint,
      REVIEWS_KEYS,
    )
    // 작성자 네 필드가 평평하게 있는지 본다 — `review.author.reviewerId` 가
    // 후기 탭과 홈 탭을 함께 죽였던 자리다.
    requireItemShape(result.items, endpoint, REVIEW_ITEM_KEYS)
    return result
  },

  /** E11 `POST /restaurants/reviews/:id/report` — 신고. */
  async reportReview(
    reviewId: number,
    payload: ReviewReportPayload,
  ): Promise<{ reviewId: number; status: string }> {
    const response = await api.post(
      `/restaurants/reviews/${reviewId}/report`,
      payload,
    )
    return response.data.result as { reviewId: number; status: string }
  },

  /**
   * E12 `GET /restaurants/:id/photos` — 사진(카테고리·커서).
   * `categoryCounts` 로 목업의 `메뉴판 240` 칩을 만든다.
   */
  async fetchPhotos(
    restaurantId: number,
    params: {
      category?: PhotoCategory | "ALL"
      cursor?: string
      limit?: number
    } = {},
    signal?: AbortSignal,
  ): Promise<RestaurantPhotosResponse> {
    const category =
      params.category && params.category !== "ALL" ? params.category : undefined
    const response = await api.get(`/restaurants/${restaurantId}/photos`, {
      // `ALL` 은 서버 열거형이 아니라 화면의 기본 칩이다. 안 보내는 것이 곧 전체다.
      params: { category, cursor: params.cursor, limit: params.limit },
      signal,
    })
    const endpoint = "GET /restaurants/:id/photos"
    const result = requireShape<RestaurantPhotosResponse>(
      response.data.result,
      endpoint,
      PHOTOS_KEYS,
    )
    requireItemShape(result.items, endpoint, PHOTO_KEYS)
    return result
  },

  /**
   * E13 `GET /restaurants/reviewers/:id` — 작성자 프로필 `{ profile, stats }`.
   *
   * **그 사람이 쓴 후기 목록은 오지 않는다.** 커서·정렬 파라미터도 서버가 읽지 않으므로
   * 보내지 않는다 — 보내면 다음 사람이 페이지네이션이 있는 줄로 읽는다.
   */
  async fetchReviewerProfile(
    reviewerId: number,
  ): Promise<ReviewerProfileResponse> {
    const response = await api.get(`/restaurants/reviewers/${reviewerId}`)
    return requireShape<ReviewerProfileResponse>(
      response.data.result,
      "GET /restaurants/reviewers/:id",
      REVIEWER_KEYS,
    )
  },

  /**
   * `GET /restaurants/:id` — 상세.
   * `userLat`/`userLng` 를 주면 거리도 계산해 준다(없으면 거리 줄을 감춘다).
   */
  async fetchDetail(
    restaurantId: number,
    params: { userLat?: number | null; userLng?: number | null } = {},
  ): Promise<RestaurantDetailDto> {
    const response = await api.get(`/restaurants/${restaurantId}`, {
      params: {
        userLat: params.userLat ?? undefined,
        userLng: params.userLng ?? undefined,
      },
    })
    return requireShape<RestaurantDetailDto>(
      response.data.result,
      "GET /restaurants/:id",
      DETAIL_KEYS,
    )
  },

  /**
   * `GET /restaurants/:id/menus` — 메뉴 + 개인화 안전도.
   *
   * `safetyLevel` 은 **요청한 사용자 기준**으로 계산된다. 프로필이 없으면 전부
   * `UNKNOWN` + `profileMissing: true` 가 오고, 그때는 배지 대신 프로필 유도를 띄운다.
   * `confidence` 는 오늘 100% `ESTIMATED` 라 "추정" 표기가 예외가 아니라 기본 상태다.
   */
  async fetchMenus(restaurantId: number): Promise<RestaurantMenusResponse> {
    const response = await api.get(`/restaurants/${restaurantId}/menus`)
    const endpoint = "GET /restaurants/:id/menus"
    const result = requireShape<RestaurantMenusResponse>(
      response.data.result,
      endpoint,
      MENUS_KEYS,
    )
    // 판정 삼각형이 빠지면 근거 없는 빈 배지가 그려진다 — 조용히 넘기지 않는다.
    requireItemShape(result.menus, endpoint, MENU_KEYS)
    return result
  },
}

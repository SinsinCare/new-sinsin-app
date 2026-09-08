/**
 * 앱 DTO ↔ 서버 응답을 **묶는 못**. `tests/restaurantApiContract.test.ts` 가 이걸 쓴다.
 *
 * ## 이 파일이 없으면 계약 테스트가 계약을 검사하지 못한다
 *
 * 타입스크립트의 `interface` 는 컴파일되면 **사라진다.** 그래서 "앱이 기대하는 필드 집합"
 * 을 런타임에 물어볼 방법이 없고, fixture 와 비교할 수도 없다 — 이번 사고가 바로 그
 * 사각지대에서 살았다(`as SomeDto` 캐스트 + 지워진 타입 = 아무도 확인하지 않음).
 *
 * 그래서 각 DTO 마다 **런타임에 존재하는 값**으로 필드 목록을 한 번 적고, 그 값의 타입을
 * `Record<keyof Dto, FieldMode>` 로 못 박는다. 이 선언 하나가 두 방향을 동시에 강제한다:
 *
 * 1. **DTO → 이 파일** : `tsc` 가 강제한다. DTO 에 필드를 더하면 여기 안 적었다고 컴파일이
 *    깨지고, DTO 에서 지우면 여기 남은 키가 초과 프로퍼티로 걸린다. 빠뜨릴 수가 없다.
 * 2. **이 파일 → 서버 응답** : 계약 테스트가 강제한다. 여기 적힌 집합과 실제 payload 의
 *    키 집합을 **양방향**으로 비교한다.
 *
 * 두 개를 이으면 원하는 성질이 나온다: **서버가 필드 이름을 바꾸면 화면이 아니라 테스트가
 * 깨진다.** 예컨대 서버가 `closeTime` → `closingTime` 으로 바꾸면
 * fixture 재생성 직후 (a) `closeTime` 이 응답에서 사라졌다 (b) `closingTime` 은 DTO 에 없다
 * 두 줄이 함께 실패한다. 사고 당시 실제로 일어난 일이 정확히 이것이었고, 그때는 아무것도
 * 실패하지 않았다.
 *
 * ## `FieldMode` 가 두 값뿐인 이유
 *
 * 값 타입은 검사하지 않는다. `rating: 5`(int) 를 `number | null` 로 받는 정도의 차이에서
 * 테스트가 깨지면 사람들이 테스트를 끄고, 꺼진 검사는 없는 검사다. 여기서 보는 것은
 * **키의 존재**뿐이다 — 이번 사고의 15건이 전부 키 문제였다(이름이 다르거나, 없거나,
 * 중첩이 다르거나). 값 타입은 화면이 `null` 을 이미 다룬다.
 */

import type {
  BookmarkCardDto,
  BookmarkListResponse,
  BookmarkToggleResponse,
  BusinessHourDto,
  ExcludedForMissingDataDto,
  LegacyRiskCounts,
  MapBounds,
  MapClusterDto,
  MapMarkerDto,
  MapSearchResponse,
  MenuItemDto,
  ParkingInfoDto,
  PhotoDto,
  RatingDistributionDto,
  RegionFacetDto,
  RegionFacetGroupDto,
  RegionFacetResponse,
  RestaurantCardDto,
  RestaurantDetailDto,
  RestaurantHoursResponse,
  RestaurantListResponse,
  RestaurantMenusResponse,
  RestaurantPhotosResponse,
  RestaurantReviewsResponse,
  RestaurantSafetyDto,
  ReviewDto,
  ReviewerProfileDto,
  ReviewerProfileResponse,
  ReviewerStatsDto,
  SafetySummaryDto,
  SearchSuggestionDto,
  SearchSuggestResponse,
  TodayHoursDto,
} from "@/src/features/restaurant/types"

/**
 * - `"always"` — 서버가 **항상** 보내는 키. 값이 `null` 인 것은 정상이고 키가 없으면 결함이다.
 * - `"omitted"` — 해당 없거나 구버전 서버에서 키가 생략될 수 있다.
 *
 * 자동완성의 `"omitted"` 는 서버 `suggestRepository.toSuggestion` 이
 * `MENU` 제안에서 `lat`/`lng`/`restaurantId` 를 아예 빼고, 그 사실을 앱이 `| null` 로
 * 잘못 알고 있어서 `item.lat !== null` 이 `undefined !== null` → `true` 로 통과했다.
 * 지도 카메라가 `lat: undefined` 로 움직인 그 버그다. **모양으로 구분되는 것이 계약이므로**
 * 테스트도 그 구분을 그대로 들고 있어야 한다 — 전부 `"always"` 로 퉁치면 이 성질이 사라진다.
 */
export type FieldMode = "always" | "omitted"

/** DTO 의 키를 하나도 빠짐없이, 그리고 없는 키는 못 적게 강제하는 표. */
export type FieldManifest<T> = Record<keyof T, FieldMode>

/* ────────────────────────── E1 GET /restaurants/map ────────────────────────── */

export const MAP_RESPONSE: FieldManifest<MapSearchResponse> = {
  mode: "always",
  markers: "always",
  clusters: "always",
  total: "always",
  truncated: "always",
  limitReached: "always",
  excludedForMissingData: "always",
  profileMissing: "always",
  distanceAvailable: "always",
  sort: "always",
  zoom: "always",
  cellDeg: "always",
  clusterTotal: "always",
  limit: "always",
  viewport: "always",
}

export const MAP_MARKER: FieldManifest<MapMarkerDto> = {
  restaurantId: "always",
  name: "always",
  lat: "always",
  lng: "always",
  cuisineType: "always",
  avgSafety: "always",
  bookmarked: "always",
  hasSafeMenu: "always",
}

export const MAP_CLUSTER: FieldManifest<MapClusterDto> = {
  key: "always",
  lat: "always",
  lng: "always",
  count: "always",
}

export const MAP_BOUNDS: FieldManifest<MapBounds> = {
  swLat: "always",
  swLng: "always",
  neLat: "always",
  neLng: "always",
}

/** 숫자가 아니라 축별 객체다 — 화면의 `> 0` 이 객체를 숫자와 비교해 늘 false 였다. */
export const EXCLUDED_FOR_MISSING_DATA: FieldManifest<ExcludedForMissingDataDto> =
  {
    nutritionTags: "always",
  }

/* ────────────────────────── E2 GET /restaurants/search ────────────────────────── */

export const LIST_RESPONSE: FieldManifest<RestaurantListResponse> = {
  items: "always",
  nextCursor: "always",
  hasMore: "always",
  total: "always",
  excludedForMissingData: "always",
  profileMissing: "always",
  distanceAvailable: "always",
  sort: "always",
}

/**
 * 사고의 진앙. 여기 있던 `nutritionBadges`·`branch`·`nextTransitionAt` 은 서버가
 * 보내지 않고, `closingTime`·`roadAddress`·`safetySummary` 는 이름이 달랐다.
 * 이 표가 fixture 와 양방향으로 맞아야 카드가 그려진다.
 */
export const CARD: FieldManifest<RestaurantCardDto> = {
  representativeMenuNames: "omitted",
  restaurantId: "always",
  name: "always",
  lat: "always",
  lng: "always",
  cuisineType: "always",
  legacyNutritionTags: "always",
  rating: "always",
  reviewCount: "always",
  businessStatus: "always",
  closeTime: "always",
  openTime: "always",
  breakStart: "always",
  breakEnd: "always",
  distanceKm: "always",
  shortAddress: "always",
  address: "always",
  jibunAddress: "always",
  zipcode: "always",
  imageUrls: "always",
  safety: "always",
  bookmarked: "always",
  avgPrice: "always",
  priceRange: "always",
  regionSido: "always",
  regionGroup: "always",
  regionSigungu: "always",
}

/** 배지의 유일한 근거. 이름이 `safetySummary` 가 아니고 모양도 다르다. */
export const CARD_SAFETY: FieldManifest<RestaurantSafetyDto> = {
  level: "always",
  menuCount: "always",
  safeMenuCount: "always",
  cautionMenuCount: "always",
  restrictedMenuCount: "always",
  unknownMenuCount: "always",
  hasSafeMenu: "always",
  driverCounts: "always",
  // Older server responses predate the complete per-nutrient counts.
  concernCounts: "omitted",
  profileMissing: "always",
}

/* ────────────────────────── E3 GET /search/suggest ────────────────────────── */

export const SUGGEST_RESPONSE: FieldManifest<SearchSuggestResponse> = {
  suggestions: "always",
}

export const SUGGESTION: FieldManifest<SearchSuggestionDto> = {
  type: "always",
  label: "always",
  // 아래 넷은 서버가 **키를 지운다**. 위 `FieldMode` 주석의 사고가 이 네 줄이다.
  restaurantId: "omitted",
  lat: "omitted",
  lng: "omitted",
  key: "omitted",
  count: "omitted",
}

/* ────────────────────────── E5 GET /regions ────────────────────────── */

export const REGION_RESPONSE: FieldManifest<RegionFacetResponse> = {
  sidos: "always",
  unresolvedCount: "always",
  unknownSidos: "always",
  unknownGroups: "always",
  total: "always",
}

export const REGION_SIDO: FieldManifest<RegionFacetDto> = {
  key: "always",
  labelKey: "always",
  allKey: "always",
  allLabelKey: "always",
  count: "always",
  ungroupedCount: "always",
  groups: "always",
}

export const REGION_GROUP: FieldManifest<RegionFacetGroupDto> = {
  key: "always",
  labelKey: "always",
  count: "always",
}

/* ────────────────────────── E6/E7 북마크 ────────────────────────── */

export const BOOKMARK_LIST_RESPONSE: FieldManifest<BookmarkListResponse> = {
  items: "always",
  nextCursor: "always",
  hasMore: "always",
}

/**
 * **`CARD` 와 다른 표다.** 가장 늦게 발견된 드리프트가 이것이었다 — 저장한 곳 카드에는
 * `safety` 가 없고(개인화 로더가 주입되지 않았다) 대신 항상 `null` 인 `safetySummary` 와
 * `bookmarkedAt` 이 있다. 두 표를 하나로 합치려는 시도를 하지 말 것: 합치는 순간
 * "북마크 카드에는 안전도 배지를 그리지 않는다" 는 규칙(D4)이 타입에서 사라진다.
 */
export const BOOKMARK_CARD: FieldManifest<BookmarkCardDto> = {
  restaurantId: "always",
  name: "always",
  lat: "always",
  lng: "always",
  cuisineType: "always",
  legacyNutritionTags: "always",
  rating: "always",
  reviewCount: "always",
  distanceKm: "always",
  shortAddress: "always",
  regionSigungu: "always",
  priceRange: "always",
  imageUrls: "always",
  bookmarked: "always",
  bookmarkedAt: "always",
  businessStatus: "always",
  openTime: "always",
  closeTime: "always",
  safetySummary: "always",
}

export const BOOKMARK_TOGGLE: FieldManifest<BookmarkToggleResponse> = {
  restaurantId: "always",
  bookmarked: "always",
}

/* ────────────────────────── 상세 GET /:id ────────────────────────── */

export const DETAIL: FieldManifest<RestaurantDetailDto> = {
  representativeMenuNames: "omitted",
  restaurantId: "always",
  name: "always",
  description: "always",
  cuisineType: "always",
  rating: "always",
  reviewCount: "always",
  address: "always",
  shortAddress: "always",
  jibunAddress: "always",
  zipcode: "always",
  phone: "always",
  lat: "always",
  lng: "always",
  regionSido: "always",
  regionGroup: "always",
  regionSigungu: "always",
  instagramUrl: "always",
  blogUrl: "always",
  youtubeUrl: "always",
  imageUrls: "always",
  photoCategoryCounts: "always",
  photoCount: "always",
  amenities: "always",
  parking: "always",
  avgPrice: "always",
  priceRange: "always",
  bookmarked: "always",
  businessStatus: "always",
  openTime: "always",
  closeTime: "always",
  breakStart: "always",
  breakEnd: "always",
  lastOrder: "always",
  nextTransitionAt: "always",
  nextOpenWeekday: "always",
  nextOpenTime: "always",
  businessHours: "always",
  hoursSource: "always",
  menuCount: "always",
  safetySummary: "always",
  avgSafety: "always",
  hasSafeMenu: "always",
  profileMissing: "always",
  proteinAxisAvailable: "always",
  legacyNutritionTags: "always",
  legacyRiskCounts: "always",
  legacyClosedDay: "always",
}

export const PARKING: FieldManifest<ParkingInfoDto> = {
  available: "always",
  free: "always",
  note: "always",
}

export const BUSINESS_HOUR: FieldManifest<BusinessHourDto> = {
  weekday: "always",
  isClosed: "always",
  openTime: "always",
  closeTime: "always",
  breakStart: "always",
  breakEnd: "always",
  lastOrder: "always",
}

export const SAFETY_SUMMARY: FieldManifest<SafetySummaryDto> = {
  safe: "always",
  caution: "always",
  restricted: "always",
  unknown: "always",
}

export const LEGACY_RISK_COUNTS: FieldManifest<LegacyRiskCounts> = {
  SAFE: "always",
  CAUTION: "always",
  HIGH_RISK: "always",
}

/* ────────────────────────── 메뉴 GET /:id/menus ────────────────────────── */

export const MENUS_RESPONSE: FieldManifest<RestaurantMenusResponse> = {
  restaurantId: "always",
  restaurantName: "always",
  menuCount: "always",
  truncated: "always",
  menus: "always",
  safetySummary: "always",
  avgSafety: "always",
  hasSafeMenu: "always",
  profileMissing: "always",
  proteinAxisAvailable: "always",
  legacyRiskCounts: "always",
}

/** 영양소 4종에 **단위 접미사가 없다**. `proteinG`/`sodiumMg` 는 계약서에만 있던 이름이다. */
export const MENU_ITEM: FieldManifest<Omit<MenuItemDto, "portionReference">> = {
  menuId: "always",
  name: "always",
  description: "always",
  price: "always",
  imageUrl: "always",
  isSignature: "always",
  calories: "always",
  protein: "always",
  sodium: "always",
  potassium: "always",
  phosphorus: "always",
  safetyLevel: "always",
  safetyDriver: "always",
  safetyRatio: "always",
  confidence: "always",
  legacyRiskLevel: "always",
  legacyRiskNutrients: "always",
}

/* ────────────────────────── 사진 GET /:id/photos ────────────────────────── */

export const PHOTOS_RESPONSE: FieldManifest<RestaurantPhotosResponse> = {
  restaurantId: "always",
  items: "always",
  categoryCounts: "always",
  total: "always",
  nextCursor: "always",
  hasMore: "always",
}

/** 서버가 주는 키가 전부다. `aspectRatio`·`caption`·`author`·`createdAt` 은 없다. */
export const PHOTO: FieldManifest<PhotoDto> = {
  photoId: "always",
  /** 격자용으로 줄인 것(`R400x0`). 원본은 `originalUrl` 이다. */
  url: "always",
  /*
    전체 화면 뷰어용 원본. `"always"` 인 이유가 `width`/`height` 와 같다 — 키가 조용히
    사라지면 뷰어가 `url` 로 폴백해 **저화질로 내려가는데 화면은 정상으로 보인다.**
    사용자가 확대해야만 알아채는 종류의 퇴화라 계약에서 못 박는다.
  */
  originalUrl: "always",
  category: "always",
  isVideo: "always",
  sortOrder: "always",
  sourceReviewId: "always",
  sourceMenuId: "always",
  /*
    075. 원본 픽셀 치수. **키는 항상 오고 값이 `null` 일 수 있다** — 사용자가 올린 후기
    사진과 카카오 CDN URL 은 서버도 치수를 모른다. `"omitted"` 가 아니라 `"always"` 인
    것이 계약의 핵심이다: 키가 사라지면 앱의 masonry 가 조용히 균일 격자로 돌아간다.
  */
  width: "always",
  height: "always",
}

/* ────────────────────────── 후기 GET /:id/reviews ────────────────────────── */

export const REVIEWS_RESPONSE: FieldManifest<RestaurantReviewsResponse> = {
  restaurantId: "always",
  items: "always",
  nextCursor: "always",
  hasMore: "always",
  totalCount: "always",
  avgRating: "always",
  ratingBreakdown: "always",
  keywordCounts: "always",
  menuCounts: "always",
}

/** 작성자는 **평평한 다섯 필드**다. `author` 중첩 객체가 후기 탭과 홈 탭을 함께 죽였다. */
export const REVIEW: FieldManifest<ReviewDto> = {
  reviewId: "always",
  authorName: "always",
  reviewerId: "always",
  authorProfileImageUrl: "always",
  authorReviewCount: "always",
  authorFollowerCount: "always",
  rating: "always",
  content: "always",
  imageUrls: "always",
  keywords: "always",
  menuName: "always",
  visitCount: "always",
  mine: "always",
  createdAt: "always",
  updatedAt: "always",
}

export const RATING_BREAKDOWN: FieldManifest<RatingDistributionDto> = {
  reviewCount: "always",
  ratedCount: "always",
  average: "always",
  distribution: "always",
}

/* ────────────────────────── 영업시간 GET /:id/hours ────────────────────────── */

export const HOURS_RESPONSE: FieldManifest<RestaurantHoursResponse> = {
  restaurantId: "always",
  hours: "always",
  hoursSource: "always",
  today: "always",
  nextTransitionAt: "always",
}

/** `today` 는 **객체**다. 요일 문자열로 알고 있어서 마감 시각이 영원히 비었다. */
export const TODAY_HOURS: FieldManifest<TodayHoursDto> = {
  weekday: "always",
  businessStatus: "always",
  openTime: "always",
  closeTime: "always",
  breakStart: "always",
  breakEnd: "always",
  lastOrder: "always",
  nextTransitionAt: "always",
  nextOpenWeekday: "always",
  nextOpenTime: "always",
}

/* ────────────────────────── E13 GET /reviewers/:id ────────────────────────── */

export const REVIEWER_RESPONSE: FieldManifest<ReviewerProfileResponse> = {
  profile: "always",
  stats: "always",
}

/** `nickName`(대문자 N)·`profileImageUrl` 이다. `nickname`/`avatarUrl` 이 아니다. */
export const REVIEWER_PROFILE: FieldManifest<ReviewerProfileDto> = {
  reviewerId: "always",
  nickName: "always",
  profileImageUrl: "always",
}

export const REVIEWER_STATS: FieldManifest<ReviewerStatsDto> = {
  reviewCount: "always",
  avgRating: "always",
  followerCount: "always",
  followingCount: "always",
}

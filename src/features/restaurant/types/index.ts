/**
 * 식당 지도 도메인 계약. 화면·훅·서비스가 전부 이 파일만 본다.
 *
 * ## 근거는 문서가 아니라 **살아 있는 응답**이다 (되돌리지 말 것)
 *
 * 이 파일은 한때 `BUILD_CONTRACT §2` 를 옮긴 것이었고, 그래서 틀렸다. 앱과 백엔드를
 * 같은 문서를 보고 **병렬로** 만드는 동안 필드 이름이 갈렸는데, 서비스가 응답을
 * `as SomeDto` 로 단정했기 때문에 **타입스크립트가 한 건도 잡지 못했다.**
 * `npx tsc --noEmit` 은 깨끗한데 화면에서는 모든 값이 `undefined` 였다.
 *
 * 실제로 터진 곳: `RestaurantCard.tsx` 의 `card.nutritionBadges.slice(...)` —
 * 그 필드는 응답에 **아예 없다**(있어서도 안 된다. 아래 배지 항목 참고).
 * 같은 응답에서 조용히 어긋나 있던 것들:
 *
 * | 앱이 기대했던 것 | 서버가 주는 것 | 처분 |
 * |---|---|---|
 * | `nutritionBadges` | (없음) | 앱에서 제거. 배지는 `safety` 에서 만든다 |
 * | `branch` | (없음 — `name` 에 병합) | 앱에서 제거 |
 * | `closingTime` | `closeTime` | 앱 이름을 서버에 맞춤 |
 * | `nextTransitionAt` | (없음. 상세·`/hours` 에만 있다) | 카드에서 제거 |
 * | `roadAddress` | `address` | 앱 이름을 서버에 맞춤 |
 * | `safetySummary{safe,caution,…}` | `safety{level,driverCounts,…}` | 이름·모양 모두 서버에 맞춤 |
 * | `excludedForMissingData: number` | `{ nutritionTags: number }` | 객체로 고침 |
 * | 자동완성 `regionGroup: string \| null` | `key?: string` (**키가 삭제된다**) | 옵셔널로 고침 |
 * | `/bookmarks` 가 카드와 같은 모양 | **다른 모양**(`bookmarkedAt`, `safety` 없음) | 별도 DTO 로 분리 |
 *
 * 그래서 규칙이 하나 늘었다: **이 파일을 문서에 맞춰 고치지 말 것.** 살아 있는 서버 응답에
 * 맞춘다. 그리고 서비스 경계에서 `src/services/data/restaurantShape.ts` 가 필수 키를
 * 런타임에 확인해, 다시 어긋나면 화면 깊은 곳의 `undefined.slice` 대신 이름을 부르는
 * 오류가 즉시 난다.
 *
 * ## 되돌리지 말 것
 *
 * - 안전도는 `SafetyLevel` 4값이다. `restaurant_menu.risk_level`(`HIGH_RISK`) 을 쓰지 않는다.
 *   그 컬럼은 고정 프리셋으로 시드돼 5단계·투석 환자가 1단계와 같은 배지를 본다.
 * - `UNKNOWN` 을 `SAFE` 로 승격하는 매핑을 만들지 않는다. 신장 환자에게 그 방향의 오류가 더 위험하다.
 * - `confidence` 를 옵셔널로 만들지 않는다. DB 의 메뉴 2013건이 **전부 `ESTIMATED`** 이므로
 *   "추정" 표기는 예외 상황이 아니라 기본 상태다. 화면이 이 값을 무조건 읽어야 한다.
 */

import type { LatLng, MapBounds, SafetyLevel } from "../map/mapBridge"

export type { LatLng, MapBounds, SafetyLevel }

/* ────────────────────────── 공통 열거형 ────────────────────────── */

/**
 * 안전도를 주도한 영양소. `foodVerdict` 의 `driver` 와 1:1.
 * 값이 `null` 이면 네 영양소 모두 여유거나 판정 불가다.
 */
export type SafetyDriver = "sodium" | "potassium" | "phosphorus" | "protein"

/**
 * 영양 추정의 신뢰도. 오늘 DB 는 100% `ESTIMATED` 다.
 * `VERIFIED` 를 조건으로 목록을 거르지 말 것 — 0건이 된다.
 */
export type NutritionConfidence = "ESTIMATED" | "VERIFIED"

/** 카드·필터 칩의 영양 기준 축. 목업 §5.3 의 5칩. */
export type NutritionTag =
  | "LOW_SUGAR"
  | "LOW_PROTEIN"
  | "LOW_SODIUM"
  | "LOW_POTASSIUM"
  | "LOW_PHOSPHORUS"

/**
 * 음식 종류. DB `cuisine_type` 은 `KOREAN|WESTERN|CHINESE|JAPANESE|ETC` 5값뿐이고
 * `SALAD`·`DESSERT` 는 **한 행도 없다**. 목업 칩을 지우지 않기 위해 타입에는 남기되,
 * 그 칩이 0건인 이유를 화면이 "필터 때문"으로 설명해야 한다(`filterCatalog.ts` 주석).
 */
export type CuisineType =
  | "KOREAN"
  | "CHINESE"
  | "JAPANESE"
  | "WESTERN"
  | "SALAD"
  | "DESSERT"
  | "ETC"

/** 목록·지도 정렬 6종. 목업 -25 그대로. 서버 `sort` 파라미터 값이다. */
export type SortOption =
  | "RECOMMENDED"
  | "RATING"
  | "REVIEWS"
  | "PRICE_HIGH"
  | "PRICE_LOW"
  | "DISTANCE"

/** 후기 정렬 3종. 목업 -33. */
export type ReviewSortOption = "LATEST" | "RATING" | "REVISIT"

/**
 * 영업 상태 6값. 서버가 KST 로 계산해 내려주고 앱은 판정하지 않는다.
 * `DAY_OFF` 는 그 요일 휴무이므로 `closeTime` 을 "까지" 로 쓰면 거짓말이 된다.
 */
export type BusinessStatusCode =
  | "OPEN"
  | "BEFORE_OPEN"
  | "BREAK_TIME"
  | "CLOSED"
  | "DAY_OFF"
  | "UNKNOWN"

/** 요일. 서버 `restaurant_business_hour.weekday` 표기. */
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"

/** 사진 카테고리. 목업 -15 의 칩과 1:1. */
export type PhotoCategory =
  | "OWNER"
  | "MENU"
  | "MENUBOARD"
  | "NUTRITION"
  | "REVIEW"

/** 편의시설. DB `restaurant.amenities` CSV 토큰. */
export type Amenity =
  | "RESERVATION"
  | "RESTROOM_GENDERED"
  | "WIFI"
  | "GROUP_SEAT"
  | "BABY_CHAIR"
  | "PRIVATE_ROOM"

/** 후기 키워드. 목업 -11 의 평점 분해 5행. */
export type ReviewKeyword = "TASTE" | "VALUE" | "KIND" | "MOOD" | "PARKING"

/* ────────────────────────── E1 GET /map ────────────────────────── */

/**
 * 지도 마커 한 개. **카드 정보를 싣지 않는다** — 사진 URL 3장 × 마커 200개면
 * 그것만으로 응답이 수백 KB 다. 카드는 E2(`/search`) 가 준다.
 */
export interface MapMarkerDto {
  restaurantId: number
  name: string
  lat: number
  lng: number
  cuisineType: CuisineType
  /**
   * 개인화 판정의 대표값.
   *
   * **마커 링 색을 가르지 않는다** — 목업의 마커는 등급과 무관하게 같은 브랜드 주황
   * 링이고, 그 이유는 `map/mapBridge.ts` 의 `MapMarker.safety` 주석에 있다. 이 값은
   * 마커의 스크린리더 라벨(`안전도 제한`)에만 쓰인다.
   */
  avgSafety: SafetyLevel
  bookmarked: boolean
  /**
   * 하나라도 `SAFE` 메뉴가 있으면 true.
   *
   * 지금은 **화면이 쓰지 않는다.** 목업에 이 상태를 그리는 마커 변형이 없고(링 안쪽을
   * 채우는 표현은 설계 근거가 없다), 지도에 등급을 색으로 흘리지 않기로 한 결정과도
   * 어긋난다. 서버 응답에는 남아 있으므로 타입에도 남겨 두지만, 브릿지로 넘기지 않는다.
   */
  hasSafeMenu: boolean
}

/**
 * 서버가 SQL 그리드로 집계한 클러스터. 클라이언트 `MarkerClusterer` 를 쓰지 않는 이유는
 * 그쪽의 개수가 "받아온 마커 수"(= limit 에 잘린 뒤) 라서 참값이 아니기 때문이다.
 */
export interface MapClusterDto {
  /** 그리드 셀 키. 같은 셀이면 같은 문자열 — 재사용 판정 키로 쓴다. */
  key: string
  lat: number
  lng: number
  count: number
}

/**
 * 조용히 빠진 곳의 수. **숫자가 아니라 축별 객체다.**
 *
 * 한때 앱이 `excludedForMissingData: number` 로 선언했고, 서버는 처음부터
 * `{ nutritionTags: 3 }` 을 보내고 있었다. `as` 캐스트라 컴파일은 통과했고 화면의
 * `excludedForMissingData > 0` 은 객체를 숫자와 비교해 **항상 false** 가 됐다 —
 * 즉 "영양 정보가 없어 N곳이 빠졌어요" 안내가 조용히 한 번도 뜨지 않았다.
 * 필터가 결과를 지운 사실을 사용자에게 알리는 문장이 이것뿐이므로 조용한 누락이 특히 나쁘다.
 *
 * 축이 더 늘 수 있으므로(서버가 다른 이유로도 뺄 수 있다) 객체로 둔다. 화면은
 * `totalExcluded()` 로 합을 읽어 새 축이 생겨도 안내가 저절로 따라오게 한다.
 */
export interface ExcludedForMissingDataDto {
  /** 태그 필터가 `nutrition_tags IS NULL` 인 곳을 뺀 수. */
  nutritionTags: number
}

export interface MapSearchResponse {
  /** 모드 판정은 **서버가** 한다. 클라이언트가 정하면 규칙이 두 곳에 생긴다. */
  mode: "MARKER" | "CLUSTER"
  markers: MapMarkerDto[]
  clusters: MapClusterDto[]
  /** 필터·bbox 를 만족하는 전체 수. `markers.length` 와 다를 수 있다. */
  total: number
  /** `limit` 에 걸려 잘렸다. 조용한 절단 금지 — 화면이 "더 있어요" 를 말해야 한다. */
  truncated: boolean
  /** 서버 상한(500)에 도달. 확대해도 줄지 않는 상황이라 `truncated` 와 문구가 다르다. */
  limitReached: boolean
  excludedForMissingData: ExcludedForMissingDataDto
  /** 프로필이 없어 안전도를 계산할 수 없었다. 배지 대신 프로필 유도를 띄운다. */
  profileMissing: boolean
  /**
   * 서버가 실제로 거리를 계산했는가(= 기준 좌표를 받았는가).
   *
   * 앱의 `userLocation !== null` 과 **같지 않다.** 좌표를 보냈어도 서버가 파싱을
   * 거부하면(범위 밖·형식 오류) 거리는 전부 `null` 로 오고, 그때 화면이 `거리순` 정렬을
   * 켜 두면 사용자는 정렬이 고장 났다고 본다. 서버가 말해 주는 쪽을 신뢰한다.
   */
  distanceAvailable: boolean
  /** 서버가 적용한 정렬. 앱이 보낸 값과 다를 수 있다(거리 기준이 없으면 서버가 내린다). */
  sort: SortOption
  /* ── 아래는 서버가 함께 주는 진단 값이다. 화면이 쓰지 않아도 응답에 있으므로 적어 둔다 ── */
  /** 요청 줌. 응답이 어느 줌의 것인지 확인용. */
  zoom: number
  /** 클러스터 격자 한 변(도). `MARKER` 모드면 `null`. */
  cellDeg: number | null
  /** 클러스터 개수. `MARKER` 모드면 `null`(`clusters.length` 와 혼동하지 말 것). */
  clusterTotal: number | null
  /** 서버가 적용한 상한. `truncated` 의 근거값이다. */
  limit: number
  /** 서버가 정규화한 뒤의 bbox. 앱이 보낸 값과 다를 수 있다(뒤집힘 교정). */
  viewport: MapBounds
}

/* ────────────────────────── E2 GET /search ────────────────────────── */

/** 개인화 안전도 집계. 카드의 영양 배지 근거이자 상세 요약. */
export interface SafetySummaryDto {
  safe: number
  caution: number
  restricted: number
  unknown: number
}

/**
 * 카드·상세의 **개인화** 안전도. 요청한 사용자의 `effectiveLimits()` 로 계산된 값이라
 * 응답을 유저 간에 공유하면 한 환자의 판정이 다른 환자에게 샌다 — 전역 캐시로 올리지 말 것.
 *
 * ## 이 객체가 카드 배지의 **유일한** 근거다
 *
 * 앱은 여기 없는 `nutritionBadges` 를 기대하고 있었고, 그래서 카드가
 * `Cannot read property 'slice' of undefined` 로 죽었다. 서버가 그 필드를 주지 않는 것은
 * 실수가 아니라 **결정**이다: 정적 `restaurant.nutrition_tags`(`저염`·`저단백` …)는
 * `mealrec` 의 `nonclinicalTags()` 가 걸러 내는 미검수 임상 주장이고, 그것을 배지로
 * 내보내면 검열 장치를 우회하는 두 번째 경로가 생긴다(`BUILD_CONTRACT §-1.1`).
 * 그래서 서버에 그 필드를 **추가하지 않았다.** 배지는 이 객체에서 앱이 만든다
 * (`utils/cardSafetyBadge.ts`).
 */
export interface RestaurantSafetyDto {
  /** 이 가게의 대표 등급. `UNKNOWN` 을 `SAFE` 로 승격하지 말 것. */
  level: SafetyLevel
  menuCount: number
  safeMenuCount: number
  cautionMenuCount: number
  restrictedMenuCount: number
  unknownMenuCount: number
  /** 하나라도 `SAFE` 메뉴가 있으면 true. `제한` 가게에서도 갈 이유가 되는 값이다. */
  hasSafeMenu: boolean
  /**
   * `주의`·`제한` 판정을 **끌어낸** 영양소별 메뉴 수(`{ sodium: 5, protein: 1 }`).
   * 없는 영양소는 키가 아예 없다 — `Record<SafetyDriver, number>` 로 선언하면
   * `counts.potassium` 이 `number` 로 보이고 실제로는 `undefined` 다.
   */
  driverCounts: Partial<Record<SafetyDriver, number>>
  /** 프로필이 없어 판정할 수 없었다. **이때 배지를 그리지 않는다.** */
  profileMissing: boolean
}

/**
 * 목록 카드 1건. **실측된 `/search` 응답 그대로다**(파일 헤더의 표 참고).
 *
 * `branch` 가 없다. 서버가 `displayName(name, branch)` 로 `name` 에 병합해 보내므로
 * 앱이 따로 붙일 것이 없다 — 되살리면 `강남불백 강남1호점 강남1호점` 이 된다.
 */
export interface RestaurantCardDto {
  restaurantId: number
  /** 지점명이 이미 병합돼 있다(`강남불백 강남1호점`). */
  name: string
  lat: number
  lng: number
  cuisineType: CuisineType
  /**
   * 원본 CSV 태그. **배지로 그리지 말 것**(§-1.1). 디버깅·비교용이다.
   *
   * `NutritionTag[]` 가 아니라 `string[]` 이다 — 서버는 DB 컬럼을 `parseCsv` 한 값을
   * 그대로 주므로 앱의 5칩 열거형에 없는 문자열이 언제든 들어온다. 열거형으로 선언해 두면
   * `nutritionTagLabelKey(tag)` 가 없는 i18n 키를 만들어 화면에 키 문자열이 찍힌다.
   */
  legacyNutritionTags: string[]
  rating: number | null
  reviewCount: number
  businessStatus: BusinessStatusCode
  /**
   * `HH:MM`. 서버 이름이 `closeTime` 이다(앱은 `closingTime` 으로 잘못 적고 있었다).
   * `DAY_OFF` 일 때는 의미가 없다 — "까지" 로 쓰지 않는다.
   */
  closeTime: string | null
  /** `HH:MM`. `BEFORE_OPEN` 일 때 "11:00 오픈" 의 근거. */
  openTime: string | null
  /** 브레이크타임. `BREAK_TIME` 상태의 재개 시각이 `breakEnd` 다. */
  breakStart: string | null
  breakEnd: string | null
  /**
   * 위치 권한이 없으면 `null` 이고, 그때 거리 줄을 **숨긴다**(0km 로 쓰지 않는다).
   * 응답의 `distanceAvailable` 이 false 면 모든 카드가 `null` 이다.
   */
  distanceKm: number | null
  /** `서울 강남구 대치동` 형태. 카드 한 줄용. */
  shortAddress: string | null
  /** 도로명 주소. 서버 이름이 `address` 다(앱은 `roadAddress` 로 잘못 적고 있었다). */
  address: string | null
  jibunAddress: string | null
  zipcode: string | null
  /** 서버가 3장으로 잘라 준다. 카드에서 `[]` 로 덮어쓰지 말 것. */
  imageUrls: string[]
  /** 배지의 유일한 근거. `safetySummary` 라는 이름이 아니다. */
  safety: RestaurantSafetyDto
  bookmarked: boolean
  avgPrice: number | null
  priceRange: string | null
  regionSido: string | null
  regionGroup: string | null
  /** `서초구`. 서버 표시용 문자열이고 필터 키가 아니다 — 필터에는 `regionGroup` 을 쓴다. */
  regionSigungu: string | null
}

export interface RestaurantListResponse {
  items: RestaurantCardDto[]
  /** 커서(keyset). OFFSET 은 금지다. */
  nextCursor: string | null
  hasMore: boolean
  /** 서버가 셀 수 있을 때만 채운다. `null` 이면 화면은 "N개 이상" 으로 내려간다. */
  total: number | null
  excludedForMissingData: ExcludedForMissingDataDto
  profileMissing: boolean
  /** `MapSearchResponse` 와 같은 뜻. 거리 줄·`거리순` 정렬의 근거다. */
  distanceAvailable: boolean
  sort: SortOption
}

/* ────────────────────────── E3 GET /search/suggest ────────────────────────── */

export type SuggestKind = "RESTAURANT" | "REGION" | "MENU"

/**
 * 자동완성 한 줄. `REGION` 은 좌표를 함께 준다 — 그래서 카카오 `services` 라이브러리
 * (지오코딩)를 붙이지 않아도 "강남역 근처" 가 동작한다.
 *
 * ## 선택 필드는 `| null` 이 아니라 **옵셔널**이다 (되돌리지 말 것)
 *
 * 서버는 해당 없는 필드의 **키를 지운다**(`suggestRepository.toSuggestion`) — `null` 로
 * 채우지 않는다. 그렇게 정한 이유가 응답 주석에 있다: 좌표 유무는 "카메라를 옮길 수 있는가"
 * 와 직결되므로 `type` 외에 모양으로도 구분되게 한 것이다.
 *
 * 앱은 이걸 `restaurantId: number | null` 로 선언하고 있었고, 그래서 화면의 가드가
 * **전부 뒤집혀 있었다**:
 *
 * ```ts
 * if (item.type === "REGION" && item.lat !== null) …  // undefined !== null → true!
 * ```
 *
 * 좌표 없는 지역 제안에서 이 가드가 통과해 `lat: undefined` 로 지도 카메라를 옮겼다.
 * 옵셔널로 선언하면 같은 비교에서 타입스크립트가 `number | undefined` 를 `number` 자리에
 * 넣지 못하게 막아 준다 — 그게 이 선언의 목적이다. `?? null` 로 정규화하지 말 것,
 * 그러면 같은 함정이 되살아난다.
 */
export interface SearchSuggestionDto {
  type: SuggestKind
  label: string
  /** `RESTAURANT` 에만 있다. */
  restaurantId?: number
  /** `RESTAURANT` 와 좌표를 아는 `REGION` 에만 있다. 둘은 항상 함께 온다. */
  lat?: number
  lng?: number
  /**
   * `REGION` 에만 있는 지역 그룹 키(`seoul-gangnam`). **`regionGroup` 이 아니다.**
   *
   * 이 값을 `?regionGroups=` 에 실어야 한다. 예전 코드처럼 `label`(`강남`)을 검색어로
   * 보내면 서버가 식당 **이름**을 매칭하므로 강남 시드 블록에서도 0건이 난다.
   */
  key?: string
  /** `REGION`·`MENU` 에만 있는 결과 수. 제안 줄에 `258곳` 을 붙이는 데 쓴다. */
  count?: number
}

export interface SearchSuggestResponse {
  suggestions: SearchSuggestionDto[]
}

/* ────────────────────────── E4 POST /ai-search ────────────────────────── */

export interface AiSearchFilters {
  cuisineTypes: CuisineType[]
  nutritionTags: NutritionTag[]
  regionGroups: string[]
  sort: SortOption | null
  openNow: boolean | null
  maxPrice: number | null
}

/**
 * 자연어 → 구조화 필터. `fallback: true` 면 LLM 없이 키워드 매칭으로 만든 결과다
 * (`GEMINI_API_KEY` 가 없으면 서버가 항상 이 길로 온다). 화면은 그 사실을 숨기지 않는다.
 */
export interface AiSearchResult {
  filters: AiSearchFilters
  /** 왜 이 필터가 되었는지 한 문장. "안전해요" 류는 서버 가드가 버린다. */
  rationale: string
  /** 필터로 못 옮긴 표현. 화면이 "이 조건은 아직 못 찾았어요" 로 정직하게 말한다. */
  unmatchedTerms: string[]
  fallback: boolean
}

/* ────────────────────────── E5 GET /regions ────────────────────────── */

/**
 * 지역 facet. 개수는 서버가 센다 — 칩에 실제 결과 수를 붙이기 위한 것이다.
 *
 * **서버는 표시 문구를 보내지 않는다. `labelKey`(i18n 키)를 보낸다.** 예전 서버는
 * `label: "강남"` 을 보냈고, 그 라벨이 키에서 파생됐기 때문에(`key.split("/").join("·")`)
 * 영어 사용자에게 한글이 그대로 나갔다 — 이 기능을 슬러그 키로 옮긴 이유 중 하나다.
 * 이제 두 쪽이 같은 i18n 키를 가리키므로 라벨은 **항상 앱 로케일**로 그려진다.
 * 화면은 `labelKey` 를 `t()` 에 넣거나 `regionCatalog.labelKeyFor()` 로 직접 만든다.
 */
export interface RegionFacetGroupDto {
  /** `<sido>-<slug>`. `regionGroups` 축에 그대로 실어 보낼 수 있는 값이다. */
  key: string
  /** `restaurant.region.groups.<key>` — 앱 카탈로그의 `labelKey` 와 같다. */
  labelKey: string
  count: number
}

export interface RegionFacetDto {
  key: string
  /** `restaurant.filter.regions.<key>` */
  labelKey: string
  /**
   * `시도 전체` 칩이 보내야 하는 키(`seoul-all`). 그룹이 아니므로 `regionGroups` 가 아니라
   * `regionSidos` 로 번역해서 보낸다(`sidoKeyOfAllKey`). `count` 가 이 칩의 개수다.
   */
  allKey: string
  allLabelKey: string
  count: number
  /**
   * 이 시도에 속하지만 어느 그룹에도 안 걸리는 수. **결함이 아니라 설계다** — 지역 칩이
   * 전국을 타일링하지 않는다(경기 이천·여주·광주시, 그리고 그룹이 0개인 세종). 그래서
   * 그룹 카운트의 합이 시도 카운트보다 작을 수 있다. 이 식당들은 `시도 전체` 로만 도달한다.
   */
  ungroupedCount: number
  /** 세종은 빈 배열이다(단일 행정단위). 화면은 2단 섹션을 감춘다. */
  groups: RegionFacetGroupDto[]
}

export interface RegionFacetResponse {
  sidos: RegionFacetDto[]
  /** 주소로 시·도를 풀지 못한 수. 0 이 아니면 수집이나 백필이 어긋났다는 신호다. */
  unresolvedCount: number
  /**
   * 카탈로그에 없는 `region_sido` / `region_group` 값. **버리지 않고 노출된다** — 비어 있지
   * 않으면 서버 DB 와 앱 카탈로그가 갈렸다는 뜻이고, 그 식당들은 어느 지역 칩으로도 도달할
   * 수 없는 상태다. 모르는 키의 표시 문구는 오지 않는다(서버가 지어내면 카탈로그에 있는
   * 것처럼 보이므로). 개발자가 읽는 진단 정보다.
   */
  unknownSidos: { key: string; count: number }[]
  unknownGroups: { sido: string; key: string; count: number }[]
  total: number
}

/* ────────────────────────── 상세 (GET /:id) ────────────────────────── */

export interface ParkingInfoDto {
  available: boolean | null
  free: boolean | null
  note: string | null
}

/**
 * 요일별 표가 있었나(`BUSINESS_HOUR`), 아니면 대표 컬럼 하나를 7행으로 펼친 것인가(`LEGACY`).
 * 화면이 "대표 영업시간" 임을 표기할 수 있게 서버가 함께 준다.
 */
export type HoursSource = "BUSINESS_HOUR" | "LEGACY"

/**
 * 서버가 KST 로 계산한 **오늘** 한 요일. `/:id` 는 이 필드들을 최상위에 펼쳐서 주고
 * `/:id/hours` 는 `today` 객체로 준다 — 같은 계산 결과라 모양을 한 타입으로 묶었다.
 *
 * `closeTime` 과 `nextOpenTime` 은 **서로 배타적**이다. `DAY_OFF` 면 `closeTime` 이
 * `null` 이고 `nextOpenWeekday`/`nextOpenTime` 이 채워진다 — 프로토타입의
 * `휴무일 21:30까지` 를 다시 만들 수 없는 모양이고, 그래서 두 짝을 함께 들고 다닌다.
 */
export interface TodayHoursDto {
  weekday: Weekday
  businessStatus: BusinessStatusCode
  openTime: string | null
  closeTime: string | null
  breakStart: string | null
  breakEnd: string | null
  lastOrder: string | null
  /** 다음 상태 전환 시각(ISO+09:00). 앱은 이 시각까지만 로컬 카운트다운하고 폴링하지 않는다. */
  nextTransitionAt: string | null
  nextOpenWeekday: Weekday | null
  nextOpenTime: string | null
}

export interface BusinessHourDto {
  weekday: Weekday
  /** 그 요일 휴무. `true` 면 open/close 를 읽지 않는다. */
  isClosed: boolean
  /** `HH:MM`. 사전순 비교가 유효한 형식이다. */
  openTime: string | null
  /** `closeTime < openTime` 이면 자정을 넘긴 영업이다. */
  closeTime: string | null
  breakStart: string | null
  breakEnd: string | null
  lastOrder: string | null
}

/**
 * `GET /:id` 응답 47키 전량. **실측 payload 를 그대로 옮긴 것이다.**
 *
 * ## 여기 있던 네 필드를 지웠다 (`branch`·`tagline`·`nutritionBadges`·`roadAddress`)
 *
 * 계약서만 보고 쓴 이름이었고 서버는 그 키를 **하나도 보내지 않는다.** 손으로 쓴
 * 인터페이스를 `as RestaurantDetailDto` 로 캐스팅하니 tsc 는 통과하고 런타임에
 * `undefined` 가 화면에 꽂혔다 — `detail.nutritionBadges.map()` 이 상세 화면 전체를
 * `Cannot read property 'map' of undefined` 로 죽이고 있었다. 각 필드가 왜 없는지:
 *
 * - `branch` — 서버 `displayName(name, branch)` 이 `name` 에 이미 합쳐서 준다.
 *   따로 받아 다시 붙이면 `868식당 본점 본점` 이 된다.
 * - `tagline` — 그런 컬럼이 없다. 한 줄 소개는 `description` 이 유일한 출처다.
 * - `nutritionBadges` — **계약 §2.4 의 필드 목록에 애초에 없다.** 원본
 *   `restaurant.nutrition_tags` 는 `mealrec` 의 `nonclinicalTags()` 검열을 통과하지 않은
 *   미검수 임상 주장이라(§-1.1) 서버가 `legacyNutritionTags` 로만 내리고, 그 값을 배지로
 *   그리지 않는 것이 이 기능의 결정이다. 개인화된 등급은 `safetySummary`·`avgSafety` 이고
 *   그건 **메뉴 단위**로만 뜻이 있다(한 식당에 제한 메뉴와 안전 메뉴가 함께 있다).
 *   그래서 히어로에서 영양 배지 자체를 없앴다 — 다시 만들지 말 것.
 * - `roadAddress` — 서버 키는 `address` 다. 컴포넌트 prop 이름(`AddressBlock`)만 그대로다.
 */
export interface RestaurantDetailDto {
  restaurantId: number
  /** 지점명이 이미 붙어 있다(`displayName`). 뒤에 무언가를 더 붙이지 말 것. */
  name: string
  description: string | null
  cuisineType: CuisineType
  rating: number | null
  reviewCount: number
  /** 도로명 주소 전문. 서버 키는 `address` 다(`roadAddress` 가 아니다). */
  address: string | null
  /** `서울 강남구 테헤란로2길` 형태. 한 줄용. */
  shortAddress: string | null
  jibunAddress: string | null
  zipcode: string | null
  phone: string | null
  lat: number | null
  lng: number | null
  regionSido: string | null
  regionGroup: string | null
  /** `강남구`. 슬러그가 아니라 원문 행정구역명이다 — 필터 축으로 보내지 말 것. */
  regionSigungu: string | null
  instagramUrl: string | null
  blogUrl: string | null
  youtubeUrl: string | null
  imageUrls: string[]
  /** 카테고리별 사진 수. 목업의 `메뉴판 240` 칩이 이 값을 쓴다. */
  photoCategoryCounts: PhotoCategoryCounts
  /** 전체 사진 수. `photoCategoryCounts` 의 합이 아니라 서버가 센 값이다. */
  photoCount: number
  amenities: Amenity[]
  parking: ParkingInfoDto
  avgPrice: number | null
  priceRange: string | null
  bookmarked: boolean
  /* 오늘의 영업 상태. `/:id/hours` 의 `today` 와 같은 계산이고 여기서는 펼쳐서 온다. */
  businessStatus: BusinessStatusCode
  openTime: string | null
  closeTime: string | null
  breakStart: string | null
  breakEnd: string | null
  lastOrder: string | null
  nextTransitionAt: string | null
  nextOpenWeekday: Weekday | null
  nextOpenTime: string | null
  businessHours: BusinessHourDto[]
  hoursSource: HoursSource
  menuCount: number
  safetySummary: SafetySummaryDto
  /** 식당 대표 등급. **배지로 그리지 않는다** — 등급은 메뉴 단위로만 뜻이 있다. */
  avgSafety: SafetyLevel
  hasSafeMenu: boolean
  profileMissing: boolean
  /**
   * 단백질 축을 판정에 쓸 수 있었나. 체중이 없으면 `protein_g_per_kg` 를 g 으로 환산할
   * 수 없어 서버가 그 축을 빼고 판정한다. `false` 면 "단백질은 못 봤다" 는 뜻이다.
   */
  proteinAxisAvailable: boolean
  /**
   * 원본 CSV 태그. 디버깅·비교용. **배지로 그리지 말 것**(위 헤더).
   *
   * `NutritionTag[]` 가 아니라 `string[]` 이다 — 카드(`RestaurantCardDto`)와 **같은
   * 서버 필드**이므로 같은 타입이어야 한다. 두 DTO 를 다른 사람이 나눠 고치는 동안
   * 여기만 열거형으로 남아 있었는데, 그 상태가 위험한 이유는 카드 쪽 주석이 이미 적어
   * 두었다: 서버는 DB 컬럼을 `parseCsv` 한 값을 그대로 주므로 앱의 5칩 열거형에 없는
   * 문자열이 언제든 들어오고, 열거형으로 선언해 두면 `nutritionTagLabelKey(tag)` 가
   * 없는 i18n 키를 만들어 **화면에 키 문자열이 그대로 찍힌다.** 오늘 DB 값이 마침
   * 5칩 안에 있다는 것은(`LOW_SODIUM` 등) 안전하다는 뜻이 아니라 아직 안 터졌다는 뜻이다.
   */
  legacyNutritionTags: string[]
  /** 정적 프리셋 집계. 화면은 쓰지 않는다. */
  legacyRiskCounts: LegacyRiskCounts
  /** 실측: NULL 이 아니라 `''` 인 행이 있다. `=== null` 검사는 틀린다. */
  legacyClosedDay: string | null
}

/**
 * 정적 `restaurant_menu.risk_level` 집계. **화면에 그리지 않는다** —
 * 고정 프리셋으로 시드돼 5기·투석 환자가 1기와 같은 값을 보게 된다.
 */
export interface LegacyRiskCounts {
  SAFE: number
  CAUTION: number
  HIGH_RISK: number
}

/**
 * 카테고리별 사진 수.
 *
 * **`all` 키는 없다.** 서버는 0건 카테고리를 아예 생략하고(`{MENU:3, OWNER:2}`),
 * 전체 수는 별도 필드로 준다 — `/:id` 의 `photoCount`, `/:id/photos` 의 `total`.
 * 예전 타입이 `all: number` 를 필수로 선언해 `전체` 칩이 `undefined` 를 그렸다.
 */
export type PhotoCategoryCounts = Partial<Record<PhotoCategory, number>>

export interface RestaurantHoursResponse {
  restaurantId: number
  hours: BusinessHourDto[]
  hoursSource: HoursSource
  /**
   * 오늘 한 요일. **평평한 `today: Weekday` 가 아니라 객체다.**
   * 예전 타입은 이걸 요일 문자열로 선언해서 `hours.find(h => h.weekday === today)` 가
   * 객체와 문자열을 비교하며 항상 `null` 을 냈고(마감 시각이 영원히 비었다),
   * 없던 `status` 필드를 읽어 상태가 항상 `UNKNOWN` 으로 떨어졌다.
   */
  today: TodayHoursDto
  /** 계약 E8 이 최상위에 요구한다 — `today` 를 열지 않고도 카운트다운을 걸 수 있게. */
  nextTransitionAt: string | null
}

/* ────────────────────────── 메뉴 (GET /:id/menus) ────────────────────────── */

/**
 * 메뉴 1건.
 *
 * `safetyLevel` 은 **요청 시각에 사용자 기준으로 계산된** 값이다. 응답을 유저 간에
 * 공유하면 한 환자의 배지가 다른 환자에게 새므로, 이 응답을 전역 캐시로 승격하지 말 것.
 */
export interface MenuItemDto {
  menuId: number
  name: string
  description: string | null
  price: number | null
  imageUrl: string | null
  isSignature: boolean
  calories: number | null
  /**
   * 영양소 4종. **단위 접미사가 붙지 않는다** — 서버 키는 `protein`/`sodium`/
   * `potassium`/`phosphorus` 다. 예전 타입의 `proteinG`/`sodiumMg`/… 는 계약서에서
   * 옮겨 적은 이름이고 응답에 그 키가 없어서, `진단하기` 가 상담으로 넘기는 영양소가
   * **네 개 모두 `undefined`** 였다. 값은 g / mg 이고 그건 여기 주석이 말한다.
   */
  protein: number | null
  sodium: number | null
  potassium: number | null
  phosphorus: number | null
  safetyLevel: SafetyLevel
  /** 판정을 주도한 영양소. 배지 옆 설명("나트륨 기준 초과")에 쓴다. */
  safetyDriver: SafetyDriver | null
  /** 기준 대비 비율. 1.0 이상이면 `RESTRICTED`. */
  safetyRatio: number | null
  /** 오늘은 항상 `ESTIMATED`. 화면에 "추정" 을 표기한다. */
  confidence: NutritionConfidence
  /** 정적 프리셋 값. 디버깅용으로만 내려온다. 화면에 그리지 말 것. */
  legacyRiskLevel: string | null
  /** 정적 프리셋이 짚은 영양소(`SODIUM` 등). 역시 화면에 그리지 말 것. */
  legacyRiskNutrients: string[]
}

export interface RestaurantMenusResponse {
  restaurantId: number
  /** 지점명이 합쳐진 상호명. 상세의 `name` 과 같은 규칙이다. */
  restaurantName: string
  menuCount: number
  /**
   * 서버 상한(300)에 닿아 잘렸다. **조용한 절단 금지**(§6) — 화면이 이 사실을 말해야 한다.
   * 예전 타입에 이 필드가 없어서 앱이 절단을 알 방법이 아예 없었다.
   */
  truncated: boolean
  menus: MenuItemDto[]
  safetySummary: SafetySummaryDto
  avgSafety: SafetyLevel
  hasSafeMenu: boolean
  profileMissing: boolean
  /** 체중이 없어 단백질 축을 빼고 판정했는가. `RestaurantDetailDto` 의 같은 필드와 같은 뜻. */
  proteinAxisAvailable: boolean
  legacyRiskCounts: LegacyRiskCounts
}

/* ────────────────────────── 사진 (GET /:id/photos) ────────────────────────── */

/**
 * 사진 1장. 서버가 주는 7키가 전부다.
 *
 * ## 지운 네 필드 (`aspectRatio`·`caption`·`author`·`createdAt`)
 *
 * 응답에 없다. `aspectRatio` 가 없다는 것이 특히 아프다 — 사진 탭의 masonry 는 원본
 * 비율로 배치하려고 만든 것인데 서버가 비율을 재지 않으므로 오늘은 2열 균일 격자로
 * 떨어진다(`PhotoTab` 이 그 사실을 주석으로 말한다). 잘림 문제는 뷰어의 2겹 레이어가
 * 막고 있으니 기능 손실은 아니지만, 서버가 `width`/`height` 를 싣는 날 여기에
 * `aspectRatio` 를 되살리면 격자가 저절로 masonry 가 된다.
 *
 * `author` 는 **한 번도 채워진 적이 없었다**. 뷰어의 작성자 블록이 `photo.author` 를
 * 읽고 있었으니 그 블록은 항상 비어 있었다는 뜻이다. 이제 `sourceReviewId` 로 찾은
 * 후기에서 작성자를 꺼낸다 — 그쪽에는 실제로 값이 있다.
 */
export interface PhotoDto {
  photoId: number
  /**
   * **격자용으로 줄인 URL.** 서버가 카카오 사진에 `R400x0` 프록시를 씌운다.
   * 실측: 원본 평균 1,701KB → 281KB(17%). 사진 탭 첫 쪽 30장이 50MB → 8MB 다.
   */
  url: string
  /**
   * 전체 화면 뷰어용 원본. 확대해서 보는 자리에서만 쓴다.
   *
   * 히어로·후기 사진처럼 서버 사진 표를 거치지 않고 만든 합성 항목에는 없을 수 있어
   * 옵셔널이다 — 없으면 `url` 로 떨어진다(줄인 것을 크게 보여 주지만, 빈 화면보다 낫다).
   */
  originalUrl?: string
  category: PhotoCategory
  isVideo: boolean
  /** 서버 정렬 순서. 목록은 이미 이 순서로 오므로 다시 정렬하지 않는다. */
  sortOrder: number
  sourceReviewId: number | null
  sourceMenuId: number | null
  /**
   * 원본 픽셀 치수(075). **`null` 이 정상이다** — 사용자가 올린 후기 사진과 카카오 CDN
   * URL 은 서버도 치수를 모른다. 사진 탭의 2열 masonry 는 값이 있으면 첫 페인트에 최종
   * 배치를 정하고, `null` 이면 `onLoad` 로 실제 크기를 재서 채운다.
   *
   * 없다고 1:1 로 가정하면 masonry 가 **균일 격자로 조용히 되돌아간다** — 그리디 2열
   * 배치는 모든 타일 높이가 같을 때 격자와 같은 결과를 내고, 아무 것도 실패하지 않는다.
   */
  width: number | null
  height: number | null
}

export interface RestaurantPhotosResponse {
  restaurantId: number
  items: PhotoDto[]
  categoryCounts: PhotoCategoryCounts
  /** 필터 없이 센 전체 사진 수. `categoryCounts` 에 `all` 이 없는 대신 이 값이 있다. */
  total: number
  nextCursor: string | null
  hasMore: boolean
}

/* ────────────────────────── 후기 (GET /:id/reviews) ────────────────────────── */

/**
 * 후기 1건.
 *
 * ## 작성자는 **중첩 객체가 아니라 평평한 네 필드**다
 *
 * 예전 타입은 `author: ReviewerProfileDto` 를 선언했고 `ReviewCard` 가
 * `review.author.reviewerId` 를 읽었다. 응답에 `author` 키가 없으니
 * `Cannot read property 'reviewerId' of undefined` 로 **후기 탭과 홈 탭이 함께 죽었다**
 * (홈 탭도 후기 3건을 미리 그린다). 서버는 `authorName`/`authorProfileImageUrl`/
 * `authorReviewCount`/`authorFollowerCount`/`reviewerId` 를 평평하게 준다.
 * 카드가 쓰기 편한 모양은 `components/detail/reviewAuthor.ts` 가 만든다 —
 * 이 타입은 **선을 그대로** 옮긴다.
 */
export interface ReviewDto {
  reviewId: number
  authorName: string
  /**
   * 작성자 프로필 화면으로 갈 수 있는 id. **오늘은 전 행이 `null`** 이다 —
   * 시드 스크립트가 `restaurant_review.user_id` 를 채우지 않았다(2039행 전부 NULL).
   * 그래서 작성자 이름은 눌리지 않는다. `/reviewer/null` 로 밀어 넣지 말 것.
   */
  reviewerId: number | null
  authorProfileImageUrl: string | null
  authorReviewCount: number
  /** 팔로우 표가 없어 `null` 로 온다. `0` 으로 접으면 없는 사실을 주장하게 된다. */
  authorFollowerCount: number | null
  rating: number | null
  content: string
  imageUrls: string[]
  keywords: ReviewKeyword[]
  menuName: string | null
  /** 목업의 `4번째 방문` 칩. */
  visitCount: number
  /** 내가 쓴 후기인지. 신고 버튼을 감추는 데 쓴다. */
  mine: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 별점 분포. 서버 응답의 **중첩** `ratingBreakdown` 객체다.
 * `distribution` 은 1점→5점 순 5칸이다(인덱스 0 이 1점).
 */
export interface RatingDistributionDto {
  reviewCount: number
  /** 별점이 실제로 매겨진 건수. `reviewCount` 와 다를 수 있다. */
  ratedCount: number
  average: number | null
  distribution: number[]
}

/**
 * `GET /:id/reviews`. 집계는 **최상위**에 있고 `ratingBreakdown` 만 중첩이다.
 *
 * `menuCounts` 는 **객체다**(`{ "비빔밥": 2 }`), 배열이 아니다. 예전 타입이
 * `{menuName,count}[]` 로 선언해 `breakdown.menuCounts.length` 가 `undefined` 였고,
 * 그래서 후기 탭의 `메뉴` 필터 칩 줄이 조용히 사라져 있었다(터지지도 않아서 안 보였다).
 */
export interface RestaurantReviewsResponse {
  restaurantId: number
  items: ReviewDto[]
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
  avgRating: number | null
  ratingBreakdown: RatingDistributionDto
  keywordCounts: Partial<Record<ReviewKeyword, number>>
  menuCounts: Partial<Record<string, number>>
}

/**
 * 후기 집계의 **화면용** 모양. `useRestaurantReviews` 가 응답에서 만든다.
 * `menuCounts` 를 여기서 정렬된 배열로 바꾼다 — 객체 키 순서에 칩 순서를 맡기지 않는다.
 */
export interface ReviewBreakdown {
  avgRating: number | null
  totalCount: number
  keywordCounts: Partial<Record<ReviewKeyword, number>>
  menuCounts: { menuName: string; count: number }[]
}

/* ────────────────────────── E13 GET /reviewers/:id ────────────────────────── */

/**
 * 작성자 프로필. **서버 키 그대로**다 — `nickName`(대문자 N)·`profileImageUrl` 이고
 * `nickname`/`avatarUrl` 이 아니다.
 *
 * `following` 필드는 **없다.** 팔로우 표가 스키마에 없어서 서버가 그 개념을 아예
 * 내리지 않는다. 예전 타입은 `following: boolean | null` 을 선언했고 화면이
 * `following !== null` 로 팔로우 UI 를 켰다 — `undefined !== null` 이 `true` 라서
 * 눌러도 아무 일 없는 버튼이 켜지는 조건이었다. 팔로우가 생기면 서버가 이 필드를
 * 추가하고, 그때 화면이 켜진다.
 */
export interface ReviewerProfileDto {
  reviewerId: number
  nickName: string
  profileImageUrl: string | null
}

export interface ReviewerStatsDto {
  /** 살아 있는 식당 후기 수. 커뮤니티 게시글은 세지 않는다. */
  reviewCount: number
  avgRating: number | null
  /** 팔로우 표가 없어 `null`. 화면은 그 칸을 **그리지 않는다**(0 을 그리지 않는다). */
  followerCount: number | null
  followingCount: number | null
}

/**
 * `GET /reviewers/:id` 응답 전량 — 계약 E13 이 약속한 `{ profile, stats }` 두 키다.
 *
 * **작성자가 쓴 후기 목록은 오지 않는다.** 예전 타입은 `reviews`/`nextCursor`/`hasMore`/
 * `avgRating`/`totalCount` 를 최상위에 선언했고 훅이 `useInfiniteQuery` 로
 * `page.reviews` 를 돌려 `for (const x of undefined)` 를 만들고 있었다. 서버·계약 모두
 * 그 목록을 약속하지 않았으므로 **앱이 틀렸다.** 화면은 목록 자리를 빈 상태로 둔다.
 */
export interface ReviewerProfileResponse {
  profile: ReviewerProfileDto
  stats: ReviewerStatsDto
}

export interface ReviewSubmitPayload {
  rating: number
  content: string
  keywords: ReviewKeyword[]
  menuName?: string | null
  imageUrls?: string[]
}

export interface ReviewReportPayload {
  reason: string
  detail?: string | null
}

/* ────────────────────────── 북마크 ────────────────────────── */

export interface BookmarkToggleResponse {
  restaurantId: number
  /**
   * 서버가 **다시 읽은** 최종 상태다. 요청한 값을 그대로 돌려주지 않는다 —
   * 연타 시 저장된 행과 어긋나는 결함(`mealrec.toggleBookmark`)을 반복하지 않기 위한 계약.
   */
  bookmarked: boolean
}

/**
 * `저장한 곳` 카드 1건. **`RestaurantCardDto` 가 아니다.**
 *
 * 앱은 `items: RestaurantCardDto[]` 로 선언하고 있었고, 실제 응답은 더 얇다.
 * 없는 것: `safety`(!), `address`·`jibunAddress`·`zipcode`, `avgPrice`,
 * `regionSido`·`regionGroup`, `breakStart`·`breakEnd`, `distanceAvailable` 맥락.
 * 있는 것: `bookmarkedAt`, 그리고 **항상 `null` 인 `safetySummary`**.
 *
 * ## `safety` 가 없는 것은 서버 결함이 아니다
 *
 * 개인화 배지의 배치 로더는 지도·검색 capability 가 소유하고, 저장한 곳 목록에는
 * 아직 주입되지 않았다(`engagementService.SafetySummaryLoader` — 구멍만 남겨 둔 상태).
 * 서버는 그 자리를 `0` 이나 `SAFE` 로 채우지 않고 `null` 로 둔다. **그게 맞다** —
 * 미판정을 안전으로 승격하지 않는 규칙(D4)이 여기에도 걸린다.
 *
 * 그래서 이 화면의 카드에는 **안전도 배지가 없다.** 회색 `정보 없음` 으로도 채우지 않는다:
 * 배지 자리가 비어 있으면 사용자는 "아직 계산되지 않았다" 로 읽지만, 회색 배지가 있으면
 * "계산해 봤는데 모른다" 로 읽힌다. 뒤쪽은 우리가 하지 않은 일을 했다고 말하는 것이다.
 * 서버가 로더를 주입하는 날 이 DTO 에 `safety` 를 더하면 카드가 저절로 배지를 얻는다.
 */
export interface BookmarkCardDto {
  restaurantId: number
  name: string
  lat: number
  lng: number
  cuisineType: CuisineType
  legacyNutritionTags: string[]
  rating: number | null
  reviewCount: number
  /**
   * **항상 `null` 이다.** 저장한 곳 화면에는 지도 맥락이 없어 서버가 기준 좌표를 받지
   * 않는다. 거리 공식을 앱에 두 번째로 복사해 여기서 계산하지 말 것(계약 D5) —
   * 같은 "2.6km" 가 화면마다 달라진다.
   */
  distanceKm: null
  shortAddress: string | null
  regionSigungu: string | null
  priceRange: string | null
  imageUrls: string[]
  /** 이 목록에서는 항상 true 다. 해제하면 서버 목록에서 사라진다. */
  bookmarked: boolean
  /** 저장 시각(ISO). 커서 정렬 키이기도 하다. */
  bookmarkedAt: string
  businessStatus: BusinessStatusCode
  openTime: string | null
  closeTime: string | null
  /** 위 헤더 참고. 로더가 주입되기 전까지 항상 `null` 이다. */
  safetySummary: RestaurantSafetyDto | null
}

export interface BookmarkListResponse {
  items: BookmarkCardDto[]
  nextCursor: string | null
  hasMore: boolean
}

/* ────────────────────────── 필터 상태 (클라이언트) ────────────────────────── */

/**
 * 화면이 들고 다니는 필터 전량. 서버 쿼리 파라미터로 1:1 번역된다.
 *
 * `regionGroups` 는 `<sido>-<slug>` 접두어 형태다(`seoul-gangnam`).
 * 접두어가 없으면 목업 -24 의 "수원 + 강남 + 서초" 다중 선택에서 어느 시도 소속인지 잃는다.
 * `<sido>-all` 은 그룹이 아니라 시도 전체를 뜻하므로 `regionSidos` 로 분리해 담는다.
 */
export interface FilterState {
  /** 필터 시트에서 마지막으로 고른 광역(단일 선택). 세부 칩 목록을 결정한다. */
  activeSido: string | null
  /** `<sido>-all` 을 제외한 실제 그룹 키. */
  regionGroups: string[]
  /** `<sido>-all` 을 고른 시도 키들. */
  regionSidos: string[]
  nutritionTags: NutritionTag[]
  cuisineTypes: CuisineType[]
  sort: SortOption
  openNow: boolean
  bookmarkedOnly: boolean
  /** 확정된 검색어. 입력 중 초안은 여기 들어오지 않는다. */
  query: string
}

/** 선택 트레이(목업 -23 하단)의 한 칩. 어느 축에서 왔는지 알아야 지울 수 있다. */
export interface FilterChipEntry {
  axis: "regionGroup" | "regionSido" | "nutritionTag" | "cuisineType"
  value: string
  labelKey: string
}

/** 지도 뷰포트 질의 파라미터. `MapBounds` + 줌 + 사용자 위치. */
export interface MapSearchParams extends MapBounds {
  zoom: number
  userLat: number | null
  userLng: number | null
}

/* ────────────────────────── 위치 권한 3상태 ────────────────────────── */

/**
 * `BUILD_CONTRACT §3.5`.
 * - `undetermined`: 지도 진입 시 **요청하지 않는다.** '내 위치' FAB 탭에서만 묻는다.
 * - `denied`: 폴백 중심 + 배너. 거리 줄을 숨기고 `DISTANCE` 정렬을 비활성한다.
 * - `granted`: 사용자 마커 + 거리 계산 + 최초 카메라 중심.
 */
export type LocationPermissionState = "undetermined" | "denied" | "granted"

export interface MyLocationState {
  status: LocationPermissionState
  coords: LatLng | null
  /** `canAskAgain === false`. 이때만 "설정 열기" 를 띄운다. */
  blockedForever: boolean
  isRequesting: boolean
}

/* ────────────────────────── 빈 상태 구분 ────────────────────────── */

/**
 * 0건·실패의 이유. 시드 데이터가 강남 한 블록(376곳)뿐이라 서울 다른 곳만 열어도 0건이고,
 * 이 구분이 없으면 전부 "오류" 로 보인다. `LOW_SUGAR` 칩과 `SALAD` 칩도 오늘 무조건 0건이다.
 *
 * ## 실패를 한 갈래로 뭉개지 않는다 (되돌리지 말 것)
 *
 * 한때 모든 실패가 `NETWORK_FAILURE` 였고 문구는 `인터넷 연결을 확인한 뒤 다시 불러와
 * 주세요` 하나였다. 그래서 **우리가 잘못된 요청을 보내 400 을 받은 상황에서도 앱이
 * 사용자의 와이파이를 의심하게 만들었다.** 사용자는 고칠 수 없는 것을 고치려 하고,
 * 우리는 버그 리포트를 "네트워크 문제" 로 분류해 닫는다. 그 오분류가 이 기능이 "만들어졌지만
 * 동작하지 않는" 상태로 오래 남은 이유 중 하나다.
 *
 * 네 갈래를 구분한다. **원인이 우리 쪽인 두 갈래는 사용자에게 다른 말을 하고, 로그에는
 * 디버깅에 필요한 것을 남긴다**(`utils/fetchError.ts`).
 */
export type EmptyReason =
  /** 이 지역에 데이터가 없다 → "지도 넓혀서 다시 찾기" */
  | "NO_DATA_HERE"
  /** 필터를 만족하는 곳이 없다 → "필터 초기화" */
  | "FILTERED_TO_ZERO"
  /**
   * 응답이 **아예 오지 않았다**(오프라인·타임아웃·DNS). 여기서만 인터넷을 언급한다 —
   * 실제로 사용자가 고칠 수 있는 유일한 경우다.
   */
  | "NETWORK_FAILURE"
  /**
   * 서버가 5xx. 사용자 잘못도, 우리 요청 잘못도 아니다 → "잠시 뒤 다시".
   * 인터넷을 의심하게 하지 않는다. 재시도가 실제로 도움이 되는 유일한 오류다.
   */
  | "SERVER_ERROR"
  /**
   * 서버가 4xx로 우리 요청을 거절했다. **우리 버그다.**
   *
   * 뒤집힌 bbox, 카탈로그에 없는 필터 키, 깨진 커서 같은 것이다. 사용자에게 인터넷을
   * 확인하라고 하지 않고, 원인이 앱에 있다고 정직하게 말한다. 재시도는 남겨 둔다 —
   * 그 사이 사용자가 필터를 바꿨으면 성공할 수 있고, 그것이 우리가 줄 수 있는 유일한 행동이다.
   */
  | "REQUEST_REJECTED"
  /**
   * 응답은 200 인데 **모양이 계약과 다르다**(`RestaurantShapeError`). 역시 우리 버그다.
   *
   * 이 기능이 겪은 사고가 정확히 이것이라 별도 갈래로 둔다. `REQUEST_REJECTED` 에 합치면
   * 로그에서 "잘못 보냈다" 와 "잘못 받았다" 가 구분되지 않고, 그 둘은 고치는 사람이 다르다.
   */
  | "RESPONSE_MALFORMED"

/* ────────────────────────── 레거시 ────────────────────────── */

/*
 * `Restaurant` 와 `CurationSectionData` 는 여기 있었다.
 *
 * 그 두 타입을 쓰던 큐레이션 서브트리(`CurationTab`/`CurationSection`/
 * `CurationRestaurantCard`/`LocationBar`/`RestaurantDetailSheet`/`AiSummaryCard`,
 * 그리고 `data/curationData.ts`)를 지웠다. 어떤 route 도 그 화면에 닿지 않았고
 * (`grep` 으로 확인: 서로만 참조하는 닫힌 섬이었다), 그 안에 이 기능에 남아 있던
 * Tamagui import·`fontWeight`·하드코딩 hex·`useAppColorScheme` 이 **전부** 들어 있었다.
 * 즉 죽은 코드가 이 기능의 DS 규칙 위반 목록을 혼자 만들고 있었고, 다음 읽는 사람에게는
 * 한 기능 안에 두 개의 디자인 시스템이 공존하는 것으로 보였다.
 *
 * 정적 카탈로그 자체(`data/restaurantsData.json`·`data/restaurantDataTypes.ts`·
 * `utils/restaurantLocalization.ts`)는 남긴다 — `tests/restaurantI18n.test.ts` 가
 * 그 번들의 영어 표기를 검증하고 있고, 카탈로그의 처분은 아직 결정되지 않은 제품
 * 판단이다(INTEGRATION_BRIEF §E.2).
 */

export interface PlaceRestaurant {
  id: string
  name: string
  tags: string[]
  description: string
  rating?: number
  reviewCount?: number
  /** 미리 서식화된 문자열(`"0.5km"`)이라 클라이언트 거리 정렬이 불가능하다. 새 코드는 `distanceKm` 을 쓴다. */
  distance: string
  address: string
  latitude: number
  longitude: number
  images: (string | number)[]
  cuisineType?: string
  menuCount?: number
  safeMenuCount?: number
  cautionMenuCount?: number
  highRiskMenuCount?: number
}

/*
 * `LegacyFilterState` 와 `FilterTab` 은 여기 있었다.
 *
 * 그 두 타입을 쓰던 화면(`PlaceSheet`/`PlaceFilterModal`/`FilterTabBar` + 세 필터 섹션과
 * `data/filterData.ts`)이 목업 기반 새 필터 시트로 전부 대체되어 지워졌다. 필터 모델이
 * 두 개 살아 있으면 다음 사람이 어느 쪽에 필드를 더해야 하는지 알 수 없다 —
 * 정본은 `FilterState` 하나다.
 *
 * `PlaceRestaurant` 는 정적 카탈로그(`restaurantsData.json`)의 행 모양이라 남긴다.
 * 그 카탈로그의 처분은 아직 결정되지 않은 제품 판단이다
 * (INTEGRATION_BRIEF §E.2 — Postgres 로 넣을지 별도 `메뉴 정보` 탭으로 둘지).
 */

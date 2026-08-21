/**
 * 필터·정렬 카탈로그. 목업 -22~-25(필터/정렬 시트)와 -33(후기 정렬), 그리고 지도 홈의
 * 카테고리 칩 레일이 전부 이 표를 본다.
 *
 * ## 실측: 이 칩들은 오늘 눌러도 0건이다 — 그리고 그건 오류가 아니다
 *
 * 살아 있는 DB 를 직접 세어 본 결과:
 * - `nutrition_tags` 에 **`LOW_SUGAR` 가 한 행도 없다.** 근거 컬럼(`sugar_g`)이 아직 없다.
 * - `cuisine_type` 은 `KOREAN 189 · WESTERN 73 · CHINESE 45 · JAPANESE 41 · ETC 28` 뿐이고
 *   **`SALAD`·`DESSERT` 가 없다.**
 * - `nutrition_tags` 는 376곳 중 **189곳이 NULL** 이라, 어떤 태그 필터든 절반을 조용히 뺀다.
 *
 * 그래서 `저당` 칩과 `샐러드`·`디저트` 칩은 지금 누르면 무조건 빈 목록이 된다.
 * **칩을 지우지 않는다** — 목업의 축이고 데이터가 채워지면 그대로 살아난다. 대신 빈 상태를
 * `EmptyReason.FILTERED_TO_ZERO`("필터 때문에 0건")로 정확히 구분해 보여 준다.
 * `NETWORK_FAILURE`("오류") 로 뭉개면 사용자는 앱이 고장 난 줄 안다. 없는 데이터를
 * 있는 척하지도, 있는 기능을 고장으로 보이게 하지도 않는다.
 *
 * `dataBacked: false` 가 그 사실을 코드에 박아 둔 표시다. 화면은 이 값으로
 * "아직 준비 중" 안내를 덧붙일 수 있다(칩을 비활성하지는 않는다 — 목업에 그 상태가 없다).
 */

import type {
  CuisineType,
  NutritionTag,
  ReviewKeyword,
  ReviewSortOption,
  SortOption,
} from "../types"

export interface FilterChipSpec<T extends string> {
  value: T
  /** 목업의 **짧은** 칩 라벨용 키(`저당`). 서술형(`당류 적은 편`)은 상세 설명 전용이다. */
  labelKey: string
  /**
   * 오늘 DB 에 이 값을 가진 행이 있는가. `false` 면 0건이 정상이다.
   * 화면은 빈 상태 문구를 고르는 데만 쓴다 — 칩을 감추거나 끄지 않는다.
   */
  dataBacked: boolean
}

/* ────────────────────────── 영양 기준 (다중 선택) ────────────────────────── */

/**
 * 목업 -23 의 5칩. 라벨 키는 **새로 만든 짧은 키**(`restaurant.nutritionTag.*`)다.
 * 기존 `restaurant.filter.nutrients.*` 는 `"당류 적은 편"` 처럼 서술형이라 칩에 안 맞고,
 * `lowProtein` 이 아예 없었다. 서술형 키는 상세 화면 설명문에 그대로 남긴다.
 */
export const NUTRITION_TAGS: readonly FilterChipSpec<NutritionTag>[] = [
  // 0건. `sugar_g` 컬럼이 없어 백필도 불가능하다(마이그레이션 075 대기).
  {
    value: "LOW_SUGAR",
    labelKey: "restaurant.nutritionTag.LOW_SUGAR",
    dataBacked: false,
  },
  {
    value: "LOW_PROTEIN",
    labelKey: "restaurant.nutritionTag.LOW_PROTEIN",
    dataBacked: true,
  },
  {
    value: "LOW_SODIUM",
    labelKey: "restaurant.nutritionTag.LOW_SODIUM",
    dataBacked: true,
  },
  {
    value: "LOW_POTASSIUM",
    labelKey: "restaurant.nutritionTag.LOW_POTASSIUM",
    dataBacked: true,
  },
  {
    value: "LOW_PHOSPHORUS",
    labelKey: "restaurant.nutritionTag.LOW_PHOSPHORUS",
    dataBacked: true,
  },
] as const

/* ────────────────────────── 음식 종류 (다중 선택) ────────────────────────── */

/**
 * 목업 -23 의 음식 종류 칩(`한식 중식 일식 양식 샐러드 …`)과 지도 홈 칩 레일의 축이 같다.
 * `ETC`(세계음식)는 목업 칩에는 없지만 DB 에 28건이 있어 목록 필터에서 필요하다 —
 * `railOnly: false` 로 두고 필터 시트에만 노출한다.
 */
export interface CuisineChipSpec extends FilterChipSpec<CuisineType> {
  /**
   * 지도 홈 카테고리 레일에 올릴 칩인지 — **오르는지만** 정한다.
   * 레일 안의 순서는 이 표가 아니라 `RAIL_ORDER` 다(시안과 목업이 갈린다).
   */
  onRail: boolean
}

export const CUISINE_TYPES: readonly CuisineChipSpec[] = [
  {
    value: "KOREAN",
    labelKey: "restaurant.cuisine.KOREAN",
    dataBacked: true,
    onRail: true,
  },
  {
    value: "CHINESE",
    labelKey: "restaurant.cuisine.CHINESE",
    dataBacked: true,
    onRail: true,
  },
  {
    value: "JAPANESE",
    labelKey: "restaurant.cuisine.JAPANESE",
    dataBacked: true,
    onRail: true,
  },
  {
    value: "WESTERN",
    labelKey: "restaurant.cuisine.WESTERN",
    dataBacked: true,
    onRail: true,
  },
  // 0건. `cuisine_type` 에 SALAD 가 없다.
  {
    value: "SALAD",
    labelKey: "restaurant.cuisine.SALAD",
    dataBacked: false,
    onRail: true,
  },
  // 0건. 목업 -23 의 잘린 6번째 칩(`디…`)이 여기다.
  {
    value: "DESSERT",
    labelKey: "restaurant.cuisine.DESSERT",
    dataBacked: false,
    onRail: true,
  },
  {
    value: "ETC",
    labelKey: "restaurant.cuisine.ETC",
    dataBacked: true,
    onRail: false,
  },
] as const

/**
 * 레일의 **순서**는 카탈로그가 아니라 시안이 정한다.
 *
 * `A3_1`·`A6_1` 을 보면 `AI 검색` 다음이 한식 · 중식 · 일식 · **샐러드** 다. 필터 시트가
 * 따르는 목업 -23 의 순서(`한식 중식 일식 양식 …`)와 네 번째부터 갈린다. 종전처럼
 * `CUISINE_TYPES.filter(onRail)` 로 두면 카탈로그 순서가 조용히 새어 들어와 다섯 번째
 * 칩이 `양식` 으로 나온다 — 화면에 보이는 네 칩 중 하나가 시안과 달랐다.
 *
 * `양식` 을 빼지는 않는다(데이터가 73건 있는 실제 축이다). 순서만 뒤로 민다.
 *
 * 여기 없는 `onRail` 칩은 맨 뒤로 간다 — 새 칩이 조용히 **맨 앞**에 끼는 것보다 낫다.
 * 그 상태는 `restaurantFilterCatalog.test.ts` 가 "레일 순서표가 onRail 집합을 전부
 * 덮는다" 로 잡는다.
 */
const RAIL_ORDER: readonly CuisineType[] = [
  "KOREAN",
  "CHINESE",
  "JAPANESE",
  "SALAD",
  "WESTERN",
  "DESSERT",
]

const railRank = (value: CuisineType): number => {
  const at = RAIL_ORDER.indexOf(value)
  return at < 0 ? RAIL_ORDER.length : at
}

/**
 * 지도 홈 칩 레일용. `AI 검색` 칩은 선택이 아니라 액션이므로 여기 들어오지 않는다.
 *
 * 레일에 **오르는지**는 카탈로그(`onRail`)가, 그 안의 **순서**는 `RAIL_ORDER` 가 정한다.
 */
export const RAIL_CUISINE_TYPES: readonly CuisineChipSpec[] =
  CUISINE_TYPES.filter((item) => item.onRail).sort(
    (a, b) => railRank(a.value) - railRank(b.value),
  )

/* ────────────────────────── 정렬 ────────────────────────── */

export interface SortOptionSpec {
  value: SortOption
  labelKey: string
  /**
   * 위치 권한이 없으면 쓸 수 없는 옵션. `거리순` 은 좌표가 없으면 서버가 거리를
   * 계산하지 못해 정렬이 무의미해진다 — 화면은 이 옵션을 disabled 로 그린다.
   */
  requiresLocation: boolean
}

/** 목업 -25 그대로 6종. 첫 항목이 기본값이다. */
export const SORT_OPTIONS: readonly SortOptionSpec[] = [
  {
    value: "RECOMMENDED",
    labelKey: "restaurant.sort.RECOMMENDED",
    requiresLocation: false,
  },
  {
    value: "RATING",
    labelKey: "restaurant.sort.RATING",
    requiresLocation: false,
  },
  {
    value: "REVIEWS",
    labelKey: "restaurant.sort.REVIEWS",
    requiresLocation: false,
  },
  {
    value: "PRICE_HIGH",
    labelKey: "restaurant.sort.PRICE_HIGH",
    requiresLocation: false,
  },
  {
    value: "PRICE_LOW",
    labelKey: "restaurant.sort.PRICE_LOW",
    requiresLocation: false,
  },
  {
    value: "DISTANCE",
    labelKey: "restaurant.sort.DISTANCE",
    requiresLocation: true,
  },
] as const

export const DEFAULT_SORT: SortOption = "RECOMMENDED"

/** 목업 -33 의 후기 정렬 3종. */
export const REVIEW_SORT_OPTIONS: readonly {
  value: ReviewSortOption
  labelKey: string
}[] = [
  { value: "LATEST", labelKey: "restaurant.reviewSort.LATEST" },
  { value: "RATING", labelKey: "restaurant.reviewSort.RATING" },
  { value: "REVISIT", labelKey: "restaurant.reviewSort.REVISIT" },
] as const

export const DEFAULT_REVIEW_SORT: ReviewSortOption = "LATEST"

/* ────────────────────────── 후기 키워드 ────────────────────────── */

/**
 * 목업 -11 의 평점 분해 5행 / 후기 작성 화면의 5카드.
 * 이모지는 목업 그대로다 — i18n 문자열에 섞지 않고 여기 둔다(번역해도 이모지는 같으므로).
 */
export const REVIEW_KEYWORDS: readonly {
  value: ReviewKeyword
  labelKey: string
  emoji: string
}[] = [
  { value: "TASTE", labelKey: "restaurant.review.keywords.TASTE", emoji: "😋" },
  { value: "VALUE", labelKey: "restaurant.review.keywords.VALUE", emoji: "🪙" },
  { value: "KIND", labelKey: "restaurant.review.keywords.KIND", emoji: "❤️" },
  { value: "MOOD", labelKey: "restaurant.review.keywords.MOOD", emoji: "🌷" },
  {
    value: "PARKING",
    labelKey: "restaurant.review.keywords.PARKING",
    emoji: "🅿️",
  },
] as const

/* ────────────────────────── 조회 헬퍼 ────────────────────────── */

const NUTRITION_INDEX = new Map(
  NUTRITION_TAGS.map((i) => [i.value, i] as const),
)
const CUISINE_INDEX = new Map(CUISINE_TYPES.map((i) => [i.value, i] as const))

export function nutritionTagLabelKey(value: NutritionTag): string {
  return (
    NUTRITION_INDEX.get(value)?.labelKey ?? `restaurant.nutritionTag.${value}`
  )
}

export function cuisineTypeLabelKey(value: CuisineType): string {
  return CUISINE_INDEX.get(value)?.labelKey ?? `restaurant.cuisine.${value}`
}

export function sortLabelKey(value: SortOption): string {
  return `restaurant.sort.${value}`
}

/**
 * 사용자가 조건을 하나라도 걸었는가.
 *
 * 두 곳이 이 판정을 쓴다. (1) 0건의 이유를 고를 때 — 필터가 걸려 있으면 "이 지역에
 * 데이터가 없다" 보다 "고른 조건에 맞는 곳이 없다" 가 먼저다(되돌릴 수 있는 원인).
 * (2) 지도에 커스텀 마커를 그릴지 — 목업(`Home_restaurant.png` → `-2`)은 카테고리를
 * 고르기 **전에는** 기본 POI 만 보여 준다.
 *
 * 두 곳이 각자 조건을 늘어놓으면 축을 하나 더할 때 한쪽만 고쳐지고, 그러면 "마커는
 * 떠 있는데 0건 문구는 데이터가 없다고 말하는" 조합이 생긴다.
 */
export function hasActiveFilter(filters: {
  cuisineTypes: readonly CuisineType[]
  nutritionTags: readonly NutritionTag[]
  regionGroups: readonly string[]
  regionSidos: readonly string[]
  query: string
  openNow: boolean
  bookmarkedOnly: boolean
}): boolean {
  return (
    filters.cuisineTypes.length > 0 ||
    filters.nutritionTags.length > 0 ||
    filters.regionGroups.length > 0 ||
    filters.regionSidos.length > 0 ||
    filters.openNow ||
    filters.bookmarkedOnly ||
    filters.query.trim().length > 0
  )
}

/**
 * 고른 조건이 오늘 데이터로 결과가 나올 수 없는 조합인가.
 * 빈 목록을 만났을 때 "필터 때문에 0건" 문구를 고르는 근거로 쓴다.
 */
export function hasUnbackedSelection(selection: {
  nutritionTags: readonly NutritionTag[]
  cuisineTypes: readonly CuisineType[]
}): boolean {
  return (
    selection.nutritionTags.some(
      (tag) => NUTRITION_INDEX.get(tag)?.dataBacked === false,
    ) ||
    selection.cuisineTypes.some(
      (type) => CUISINE_INDEX.get(type)?.dataBacked === false,
    )
  )
}

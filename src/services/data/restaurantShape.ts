/**
 * 식당 응답의 **런타임 모양 검사**. 서비스 경계에서만 쓴다.
 *
 * ## 왜 존재하나 — 이 파일은 사고 보고서다
 *
 * 앱과 백엔드를 같은 문서를 보고 **병렬로** 만들었고, 그 사이에 필드 이름이 갈렸다.
 * 앱의 DTO 는 손으로 쓴 `interface` 이고 서비스가 `response.data.result as SomeDto` 로
 * 단정(assertion)했기 때문에 **타입스크립트가 한 건도 잡지 못했다** — `npx tsc --noEmit`
 * 은 깨끗한데 런타임에는 모든 필드가 `undefined` 였다. 실제로 터진 곳:
 *
 * ```
 * RestaurantCard.tsx  Cannot read property 'slice' of undefined
 *                     (card.nutritionBadges.slice(...) — 그 필드가 응답에 아예 없었다)
 * ```
 *
 * 그리고 그것은 하나가 아니었다. 같은 응답에서 `closingTime`→`closeTime`,
 * `roadAddress`→`address`, `safetySummary`→`safety`(모양까지 다름),
 * `excludedForMissingData` 가 숫자 → 객체, 자동완성의 `regionGroup`→`key`,
 * 그리고 `/bookmarks` 는 `/search` 와 **아예 다른 카드 모양**을 준다는 사실까지
 * 전부 조용히 통과하고 있었다.
 *
 * `as` 캐스트는 "내가 확인했다" 는 뜻인데 아무도 확인하지 않았다. 그래서 캐스트 자리마다
 * **싸구려 검사 한 줄**을 둔다. 목적은 검증이 아니라 **비난의 방향을 바꾸는 것**이다:
 * 화면 깊은 곳의 `undefined.slice` 대신, 어느 엔드포인트의 어느 키가 없는지 이름을 부르는
 * 오류를 서비스 경계에서 던진다. 다음 사람은 스택 첫 줄에서 원인을 읽는다.
 *
 * ## 스키마 라이브러리를 넣지 않는다
 *
 * zod 를 넣으면 번들이 커지고, 값 타입까지 검사하기 시작하면 서버가 `rating: 5`(int) 를
 * 주는데 앱이 `number|null` 을 기대하는 정도의 무해한 차이에서도 화면이 죽는다.
 * 여기서 보는 것은 **키의 존재**와 **배열인지**뿐이다. 값이 `null` 인 것은 정상이다
 * (`rating`·`distanceKm`·`nextCursor`·북마크 카드의 `safetySummary` 가 실제로 `null` 이다).
 *
 * ## 프로덕션에서도 돈다 (`__DEV__` 로 감싸지 않았다)
 *
 * 비용은 응답 1건당 `키 수 × 항목 수` 번의 `in` 검사다. `/search` 한 페이지(20건 × 약
 * 12키)면 240번이고, 할당도 없다 — 이미지 20장을 디코딩하는 화면에서 측정 불가능한 값이다.
 * 그래서 개발 빌드로만 제한하지 않았다. **그리고 그게 더 안전하다**: 이 앱에서 모양이
 * 어긋난 카드는 "안전도 배지가 하나 빠진 카드" 가 아니라 **신장 환자에게 근거 없이 그려진
 * 카드**다. 조용히 반쯤 그리는 것보다 크게 실패하는 편이 맞다.
 *
 * 대신 그 실패가 "인터넷 연결을 확인하세요" 로 오분류되지 않게, 화면 쪽에서
 * `RESPONSE_MALFORMED` 라는 별도 빈 상태로 구분한다(`utils/fetchError.ts`).
 */

import { logger } from "@/src/lib/logger"

/**
 * 응답 모양이 계약과 다르다. **우리 쪽 결함**이고 통신 오류가 아니다.
 *
 * `message` 는 한국어 한 줄로 사람이 읽을 수 있게 두고(개발자 대상 — 화면에 그대로
 * 띄우지 않는다), 기계가 분류할 값은 `endpoint`/`missing` 에 따로 담는다.
 */
export class RestaurantShapeError extends Error {
  constructor(
    /** `GET /restaurants/search` 처럼 사람이 읽는 엔드포인트 이름. */
    readonly endpoint: string,
    /** 없거나 모양이 틀린 키 목록. */
    readonly missing: readonly string[],
    /**
     * `items[0]`·`filters`·`[0]` 처럼 응답 **안에서** 어느 위치였는지. 최상위면 빈 문자열.
     *
     * 이 문자열은 **응답에 실제로 있는 경로**여야 한다. 봉투 없는 응답(`/nearby`)에
     * `items[0]` 이라고 적으면 이 파일이 하려는 일(비난의 방향을 바로잡는 것)과
     * 정반대로, 존재하지 않는 컨테이너를 범인으로 지목하게 된다.
     */
    readonly at: string,
  ) {
    const where = at ? `${endpoint} 의 ${at}` : endpoint
    super(`서버 응답에 ${missing.join(", ")} 가 없습니다 (${where})`)
    this.name = "RestaurantShapeError"
    // RN 의 트랜스파일 타깃에서 `instanceof` 가 깨지지 않게(ApiError 와 같은 처리).
    Object.setPrototypeOf(this, RestaurantShapeError.prototype)
  }
}

export function isRestaurantShapeError(
  error: unknown,
): error is RestaurantShapeError {
  return error instanceof RestaurantShapeError
}

/** 객체인가. 배열과 `null` 은 객체가 아니다 — 둘 다 `typeof === "object"` 라 따로 막는다. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * `value` 에 `keys` 가 모두 있는지 본다. **값은 보지 않는다** — `null` 은 정상이다.
 * 이름 끝에 `[]` 를 붙인 키는 배열이어야 한다(`"items[]"`). 카드 목록이 객체 하나로
 * 오는 사고(단건 응답을 목록 자리에 꽂는 실수)는 `.map` 이 터지기 전에 여기서 잡는다.
 */
function collectMissing(
  value: unknown,
  keys: readonly string[],
): string[] | null {
  if (!isRecord(value)) return ["(응답이 객체가 아닙니다)"]
  const missing: string[] = []
  for (const key of keys) {
    const wantsArray = key.endsWith("[]")
    const name = wantsArray ? key.slice(0, -2) : key
    if (!(name in value)) {
      missing.push(name)
      continue
    }
    if (wantsArray && !Array.isArray(value[name])) missing.push(`${name}(배열)`)
  }
  return missing.length > 0 ? missing : null
}

/**
 * 최상위 응답을 검사하고 그대로 돌려준다. `as` 캐스트를 이 함수 호출로 **대체**한다 —
 * 캐스트를 남겨 두고 검사를 옆에 두면 다음 사람이 검사 없는 캐스트를 하나 더 만든다.
 */
export function requireShape<T>(
  value: unknown,
  endpoint: string,
  keys: readonly string[],
  /**
   * 중첩 객체를 볼 때의 **응답 안 위치**(`ai-search` 의 `filters`, `/hours` 의 `today`,
   * 후기 작성 응답의 `review`). 최상위면 비운다.
   *
   * 중첩을 검사하면서 이 인자를 비워 두면 봉투가 없어서 죽은 것과 봉투 안이 비어서 죽은
   * 것이 **같은 문장**으로 나온다 — 이 인자가 존재하는 이유가 정확히 그 상황이다.
   * 중첩 객체를 검사하는 자리에서는 엔드포인트 문자열에 위치를 섞지 말고 여기에 적을 것
   * (그러면 `endpoint` 가 기계 분류용 값이 아니게 된다).
   */
  at = "",
): T {
  const missing = collectMissing(value, keys)
  if (missing) {
    // 던지기 전에 남긴다. 던진 오류는 react-query 가 잡아 화면 상태로 바꾸므로,
    // 어느 키가 문제였는지는 로그에만 남는다. 토큰·개인정보는 담지 않는다.
    logger.error(
      "[restaurant] 응답 모양 불일치",
      at ? `${endpoint} ${at}` : endpoint,
      missing.join(","),
    )
    throw new RestaurantShapeError(endpoint, missing, at)
  }
  return value as T
}

/**
 * 목록 응답의 **모든 항목**을 검사한다.
 *
 * 첫 항목만 보고 끝낼 수도 있다(구조 드리프트는 보통 행마다 같다). 그래도 전부 보는
 * 이유는 서버가 행마다 다른 경로로 조립하는 경우가 실제로 있기 때문이다 —
 * `/bookmarks` 의 `safetySummary` 는 배지 로더가 주입됐는지에 따라 채워지고,
 * 그런 분기는 언제든 "일부 행에만 키가 있는" 상태를 만들 수 있다. 비용은 위 헤더 참고.
 */
export function requireItemShape(
  items: readonly unknown[],
  endpoint: string,
  keys: readonly string[],
  /**
   * 이 배열이 응답에서 **어느 키에 담겨 있었나**. 오류 위치가 `<container>[N]` 이 된다.
   * 최상위가 배열이라 담긴 키가 없으면(`/nearby`) 빈 문자열을 줘서 `[N]` 으로 만든다 —
   * 기본값을 그대로 쓰면 응답에 **없는 `items` 키**를 범인으로 지목한다.
   */
  container = "items",
): void {
  for (let index = 0; index < items.length; index += 1) {
    const missing = collectMissing(items[index], keys)
    if (missing) {
      const at = container ? `${container}[${index}]` : `[${index}]`
      logger.error(
        "[restaurant] 응답 항목 모양 불일치",
        `${endpoint} ${at}`,
        missing.join(","),
      )
      throw new RestaurantShapeError(endpoint, missing, at)
    }
  }
}

/**
 * **최상위가 배열인** 응답을 검사하고 그대로 돌려준다. 지금은 레거시 `/nearby` 하나다.
 *
 * `requireShape` 를 쓸 수 없다 — `isRecord` 가 배열을 객체가 아니라고 거절하므로
 * 정상 응답이 항상 죽는다. 배열 검사를 서비스 쪽에 인라인으로 두는 길도 있었지만,
 * 그러면 `as` 캐스트가 그 자리에 남아 이 파일이 막으려는 습관이 그대로 돌아온다.
 */
export function requireArrayShape<T>(
  value: unknown,
  endpoint: string,
  keys: readonly string[],
): T[] {
  if (!Array.isArray(value)) {
    // 목록이 봉투(`{ items: [...] }`)로 바뀌는 드리프트가 이 자리에서 잡힌다.
    logger.error("[restaurant] 응답이 배열이 아님", endpoint)
    throw new RestaurantShapeError(endpoint, ["(응답이 배열이 아닙니다)"], "")
  }
  /* 담긴 키가 **없다** — 이 응답에는 `items` 가 아예 없으므로 위치는 `[0]` 이다.
     `items[0]` 이라고 적으면 다음 사람이 응답에서 찾을 수 없는 경로를 뒤진다. */
  requireItemShape(value, endpoint, keys, "")
  return value as T[]
}

/* ────────────────────────── 엔드포인트별 필수 키 ────────────────────────── */

/*
 * 아래 목록은 **살아 있는 서버에서 실측한 것**이다(강남 376곳, alembic 074).
 * 문서가 아니라 실제 응답이 근거다 — 이 사고의 원인이 "문서를 보고 병렬로 만든 것"
 * 이었으므로, 문서와 응답이 어긋나면 응답이 이긴다.
 *
 * 여기에 키를 더할 때는 그 키를 화면이 실제로 읽는지 확인할 것. 읽지 않는 키를 필수로
 * 걸면 서버가 정리(deprecate)할 때 앱이 이유 없이 죽는다.
 */

/**
 * 레거시 `GET /restaurants/nearby` 의 항목 1건. **최상위가 배열이라** 이 표만
 * `requireArrayShape` 로 쓴다.
 *
 * **오늘 이 표를 읽는 화면은 없다.** `fetchNearby` 의 호출부는 테스트 둘뿐이고
 * (`restaurantI18n`·`restaurantResponseGuards`), 그래서 `avgRiskLevel` 과 세 개의 개수도
 * 지금은 아무 배지의 근거가 아니다 — 카드 안전도는 `/search` 의 `safety` 에서 나온다
 * (`utils/cardSafetyBadge.ts`). 즉 이 표는 위 `엔드포인트별 필수 키` 머리말의
 * 규칙("읽는지 확인하고 걸어라")의 **예외**이고, 예외인 이유는 하나다: 배포된 구버전
 * 빌드 때문에 서버 라우트가 남아 있어서 그 함수가 되살아날 수 있다. 되살아나는 날
 * 조용히 반쯤 그리지 않게 하려고 미리 걸어 둔다.
 *
 * 서버 `cardPayload` 가 실제로 조립하는 키 중, 앱 타입이 **필수로 선언한 것**만 건다.
 *
 * `phone` 은 **일부러 뺐다.** `NearbyRestaurantItem` 은 `phone: string | null` 로
 * 필수 선언하고 있지만 `cardPayload` 는 그 키를 조립하지 않는다 — 필수로 걸면 정상
 * 응답이 전부 죽는다. 선언 쪽이 틀렸고, 읽는 곳이 없어서 아무도 못 봤을 뿐이다.
 * `shortAddress`·`rating`·`openTime` 류는 앱이 옵셔널로 선언했으므로 걸지 않는다.
 */
export const NEARBY_CARD_KEYS = [
  "restaurantId",
  "name",
  "lat",
  "lng",
  "cuisineType",
  "distanceKm",
  // 카드 사진. 배열이 아니면 `.slice(0, 3)` 이 화면에서 터진다.
  "imageUrls[]",
  "menuCount",
  "safeMenuCount",
  "cautionMenuCount",
  "highRiskMenuCount",
  "avgRiskLevel",
] as const

/** E1 `/map` 최상위. `markers`·`clusters` 는 모드에 따라 비지만 **키는 항상 있다.** */
export const MAP_KEYS = [
  "mode",
  "markers[]",
  "clusters[]",
  "total",
  "truncated",
  "limitReached",
  "excludedForMissingData",
  "profileMissing",
] as const

/** 마커 1건. `avgSafety` 는 스크린리더 라벨의 근거라 없으면 무음 배지가 된다. */
export const MAP_MARKER_KEYS = [
  "restaurantId",
  "name",
  "lat",
  "lng",
  "cuisineType",
  "avgSafety",
  "bookmarked",
] as const

/** 클러스터 1건. `key` 가 없으면 재사용 판정이 매번 새 셀로 보여 지도가 깜빡인다. */
export const MAP_CLUSTER_KEYS = ["key", "lat", "lng", "count"] as const

/** E2 `/search` 최상위. */
export const LIST_KEYS = [
  "items[]",
  "nextCursor",
  "hasMore",
  "total",
  "excludedForMissingData",
  "profileMissing",
] as const

/**
 * 카드 1건. `safety` 가 이 사고의 진앙이다 — 배지가 이 객체에서만 나오므로
 * 없으면 신장 환자가 근거 없는 카드를 본다. `imageUrls` 는 배열임을 확인한다
 * (`PhotoStrip` 이 `.length`/`.slice` 를 바로 부른다).
 */
export const CARD_KEYS = [
  "restaurantId",
  "name",
  "cuisineType",
  "businessStatus",
  "imageUrls[]",
  "safety",
  "bookmarked",
] as const

/**
 * 북마크 카드 1건. **`/search` 카드와 다른 목록이다.** 서버는 여기에
 * `safety` 를 넣지 않고(개인화 배지 로더가 주입되지 않았다) `safetySummary: null` 을
 * 준다. 그 사실을 검사에도 적어 둔다 — `CARD_KEYS` 를 재사용하면 이 목록은 항상 죽는다.
 */
export const BOOKMARK_CARD_KEYS = [
  "restaurantId",
  "name",
  "cuisineType",
  "businessStatus",
  "imageUrls[]",
  "bookmarkedAt",
] as const

/** E3 `/search/suggest`. 항목의 선택 키(`lat`/`restaurantId`/`key`)는 **없을 수 있다.** */
export const SUGGEST_KEYS = ["suggestions[]"] as const
export const SUGGESTION_KEYS = ["type", "label"] as const

/**
 * E4 `POST /ai-search` 최상위.
 *
 * `fallback` 을 필수로 거는 것이 이 표의 핵심이다. 키가 사라지면 `isFallback` 이 조용히
 * `false` 가 되어, LLM 없이 키워드 매칭으로 만든 결과를 **AI 가 읽은 것처럼** 보여 준다
 * (`useAiSearch` 머리말이 금지하는 바로 그 동작이다). `unmatchedTerms` 는 시트가
 * `.length`/`.join` 을 바로 부르므로 배열임까지 본다.
 *
 * **404 는 이 표의 관할이 아니다.** 라우트가 조건부 등록이라(서버 `routes.ts` E4) `ai`
 * 의존성을 받지 못한 서버에는 경로 자체가 없다. 그 404 는 axios 가 먼저 던지므로 여기까지
 * 오지 않는다 — 서비스에서 검사 순서를 바꾸지 말 것.
 *
 * 그때 앱이 무엇을 하는지는 **실제로 확인한 대로 적는다**: `CategoryChipRail` 은 `AI 검색`
 * 칩을 조건 없이 그리고, `useAiSearch` 는 던진 오류를 `isError` 로 바꿀 뿐이다. 즉 칩은
 * 그대로 있고 시트 안에서 오류 + 재시도가 보인다 — **숨기지 않는다.** (서버 쪽 주석은
 * "앱이 칩을 숨긴다" 고 적혀 있지만 그건 앱에 없는 동작이다. 옮겨 적지 말 것.)
 * 덧붙여 실제 배포에서는 `app.ts` 가 `ai` 를 무조건 주입하므로 이 404 자체가 안 난다 —
 * 이 경계는 `ai` 없이 앱을 세우는 서버 테스트에서만 살아 있다.
 */
export const AI_SEARCH_KEYS = [
  "filters",
  "rationale",
  "unmatchedTerms[]",
  "fallback",
] as const

/**
 * 그 응답의 `filters` **중첩 객체**. 세 배열은 `AiSearchSheet.filterLabelKeys` 가
 * `for...of` 로 바로 도는 자리라, 하나만 없어도 `undefined is not iterable` 로 시트가
 * 통째로 죽는다.
 *
 * `q`(음식 이름)는 넣지 않는다 — 구버전 서버가 보내지 않는 필드이고 앱도 옵셔널로
 * 선언했다. 넣으면 구버전 서버에 붙은 앱에서 AI 검색이 항상 실패한다.
 */
export const AI_SEARCH_FILTER_KEYS = [
  "cuisineTypes[]",
  "nutritionTags[]",
  "regionGroups[]",
  "sort",
  "openNow",
  "maxPrice",
] as const

/** E5 `/regions`. */
export const REGION_KEYS = [
  "sidos[]",
  "unresolvedCount",
  "unknownSidos[]",
  "unknownGroups[]",
  "total",
] as const
export const REGION_SIDO_KEYS = [
  "key",
  "labelKey",
  "allKey",
  "allLabelKey",
  "count",
  "ungroupedCount",
  "groups[]",
] as const

/** E6 `/bookmarks` 최상위. */
export const BOOKMARK_LIST_KEYS = ["items[]", "nextCursor", "hasMore"] as const

/** E7 `PUT|DELETE /:id/bookmark`. 서버가 **다시 읽은** 상태가 이 두 키다. */
export const BOOKMARK_TOGGLE_KEYS = ["restaurantId", "bookmarked"] as const

/* ── 상세 5면. 같은 사고가 상세에서도 그대로 났다(아래 각 목록의 주석 참고) ── */

/**
 * `GET /:id` 최상위.
 *
 * 시각 필드 다섯 개(`openTime`…`nextOpenTime`)를 **모두** 필수로 건다. 이 중 하나만
 * 조용히 사라져도 상태 줄은 그려지는데 보조 문구만 없어져서 — `휴무일` 만 뜨고
 * `수요일 11:00 오픈` 이 사라지는 식으로 — 아무도 결함으로 보지 않는다.
 * 실제로 앱이 `nextOpenWeekday`/`nextOpenTime` 을 아예 넘기지 않고 있었고 그게 이번
 * 수정 항목이었다. `address` 도 같은 이유다(없으면 주소 줄이 통째로 사라진다).
 */
export const DETAIL_KEYS = [
  "restaurantId",
  "name",
  "description",
  "cuisineType",
  "address",
  "imageUrls[]",
  "photoCategoryCounts",
  "photoCount",
  "amenities[]",
  "parking",
  "bookmarked",
  "businessStatus",
  "openTime",
  "closeTime",
  "breakEnd",
  "lastOrder",
  "nextTransitionAt",
  "nextOpenWeekday",
  "nextOpenTime",
  "safetySummary",
  "menuCount",
  "profileMissing",
] as const

/** `GET /:id/menus` 최상위. `truncated` 는 조용한 절단을 막는 유일한 신호다(§6). */
export const MENUS_KEYS = [
  "restaurantId",
  "restaurantName",
  "menus[]",
  "menuCount",
  "truncated",
  "safetySummary",
  "profileMissing",
] as const

/**
 * 메뉴 1건. **이 기능의 핵심**이라 판정 삼각형(`safetyLevel`·`safetyDriver`·`confidence`)을
 * 전부 필수로 건다. `safetyLevel` 이 없으면 `MenuRow` 의 배지 조건이
 * `undefined !== "UNKNOWN"` → `true` 로 통과해 **라벨이 빈 배지**가 그려진다. 즉 근거
 * 없는 배지를 신장 환자에게 보여 주는 정확히 그 실패다 — 조용히 넘기면 안 되는 종류다.
 *
 * 영양소 4종은 `진단하기` 가 상담으로 싣는 값이다(단위 접미사 없는 이름이 서버 정본).
 */
export const MENU_KEYS = [
  "menuId",
  "name",
  "description",
  "price",
  "imageUrl",
  "isSignature",
  "calories",
  "protein",
  "sodium",
  "potassium",
  "phosphorus",
  "safetyLevel",
  "safetyDriver",
  "confidence",
] as const

/** `GET /:id/photos` 최상위. `total` 이 `categoryCounts.all` 을 대신한다(`all` 키는 없다). */
export const PHOTOS_KEYS = [
  "restaurantId",
  "items[]",
  "categoryCounts",
  "total",
  "nextCursor",
  "hasMore",
] as const

/** 사진 1건. `sourceReviewId` 가 없으면 뷰어의 작성자·태그 칩이 전부 사라진다. */
export const PHOTO_KEYS = [
  "photoId",
  // 격자용으로 줄인 URL(`R400x0`). 원본 평균 1,701KB → 281KB.
  "url",
  // 전체 화면 뷰어용 원본. 키가 사라지면 뷰어가 조용히 저화질로 내려간다.
  "originalUrl",
  "category",
  "isVideo",
  "sortOrder",
  "sourceReviewId",
  "sourceMenuId",
  // 075. 값은 `null` 일 수 있지만 **키는 항상 온다**. 키가 사라지면 사진 탭의 masonry 가
  // 조용히 균일 격자로 되돌아가므로(모든 타일이 같은 높이가 된다) 여기서 못 박는다.
  "width",
  "height",
] as const

/**
 * `GET /:id/reviews` 최상위. 집계는 최상위에 있고 `ratingBreakdown` 만 중첩이다.
 * `menuCounts` 는 **객체**이므로 `[]` 를 붙이지 않는다 — 붙이면 정상 응답이 죽는다.
 */
export const REVIEWS_KEYS = [
  "restaurantId",
  "items[]",
  "nextCursor",
  "hasMore",
  "totalCount",
  "avgRating",
  "ratingBreakdown",
  "keywordCounts",
  "menuCounts",
] as const

/**
 * `POST /:id/reviews` 최상위. **후기가 아니라 봉투다.**
 * 이 표가 없으면 앱이 봉투를 후기로 착각해, 등록 성공 뒤에 실패 토스트가 뜬다.
 */
export const REVIEW_CREATE_KEYS = ["review", "photosIndexed"] as const

/**
 * 후기 1건. 작성자 네 필드가 **평평하게** 있는지 본다 — 앱이 `author` 중첩 객체를
 * 기대해서 `review.author.reviewerId` 가 후기 탭과 홈 탭을 함께 죽였다.
 */
export const REVIEW_ITEM_KEYS = [
  "reviewId",
  "authorName",
  "reviewerId",
  "authorProfileImageUrl",
  "authorReviewCount",
  "authorFollowerCount",
  "rating",
  "content",
  "imageUrls[]",
  "keywords[]",
  "visitCount",
  "mine",
  "createdAt",
] as const

/**
 * E11 `POST /reviews/:id/report` 최상위.
 *
 * `status` 가 없으면 신고 성공 토스트 뒤에 `undefined` 를 든 콜백이 화면으로 흘러간다.
 *
 * `alreadyReported` 는 **앱이 읽는다** — 시트가 이 값으로 `reportAlready`/`reportDone`
 * 토스트를 가른다. 없으면 어제 접수된 신고가 방금 접수된 것처럼 말한다. 필수로 걸어도
 * 되는 근거는 서버 코드다: `createReviewReport` 의 성공 반환이 **하나뿐이고** 거기서
 * `alreadyReported: !row.inserted` 로 항상 채운다(나머지 두 갈래는 `NOT_FOUND`·
 * `FORBIDDEN` 을 던져 200 이 아니다). 옵셔널로 두면 "안 온 것" 과 "첫 신고" 가 같은
 * 모양이 되는데, 그 둘은 사용자에게 다른 문장이다.
 *
 * `reportId`·`createdAt` 은 서버가 함께 주지만 **앱이 읽지 않으므로 걸지 않는다**
 * (읽지 않는 키를 필수로 걸면 서버가 정리하는 날 이유 없이 죽는다).
 */
export const REVIEW_REPORT_KEYS = [
  "reviewId",
  "status",
  "alreadyReported",
] as const

/** E8 `GET /:id/hours` 최상위. */
export const HOURS_KEYS = [
  "restaurantId",
  "hours[]",
  "hoursSource",
  "today",
  "nextTransitionAt",
] as const

/**
 * `today` **객체**의 키. 앱이 이걸 요일 문자열로 알고 있었던 탓에 마감 시각이 영원히
 * 비고 상태가 항상 `UNKNOWN` 이었다 — 그 사고를 다시는 조용히 지나가지 않게 한다.
 */
export const HOURS_TODAY_KEYS = [
  "weekday",
  "businessStatus",
  "openTime",
  "closeTime",
  "breakEnd",
  "lastOrder",
  "nextTransitionAt",
  "nextOpenWeekday",
  "nextOpenTime",
] as const

/**
 * E13 `GET /reviewers/:id`. 계약이 약속한 두 키가 전부다 — 작성자가 쓴 **후기 목록은
 * 오지 않는다.** 앱이 `reviews`/`nextCursor` 를 기대하고 있었지만 서버도 계약도 그것을
 * 약속하지 않았으므로 여기에 넣지 않는다(넣으면 정상 응답이 죽는다).
 */
export const REVIEWER_KEYS = ["profile", "stats"] as const

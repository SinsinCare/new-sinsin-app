/**
 * 요청 관문. **서버가 400 으로 거절할 것이 확실한 요청은 여기서 막는다.**
 *
 * ## 왜 이 파일이 생겼나 — 지도가 "인터넷 확인" 이라고 말하던 이유
 *
 * 앱과 백엔드가 계약서만 보고 따로 만들어졌고, 앱은 서버가 **거절하는** 파라미터를
 * 그대로 실어 보냈다. 실측으로 확인한 세 가지다(`:8100`, 2026-07-30):
 *
 * ```
 * GET /restaurants/map?…&zoom=4.5        → 400 query.zoom  int_parsing
 * GET /restaurants/map?…&zoom=0          → 400 query.zoom  greater_than_equal
 * GET /restaurants/map?…&zoom=15         → 400 query.zoom  less_than_equal
 * GET /restaurants/map?bbox(대각 561km)  → 400 query.neLat value_error(200km)
 * GET /restaurants/search?sort=DISTANCE  → 400 query.userLat missing
 * ```
 *
 * 그 400 들은 화면에서 전부 하나의 빈 상태로 뭉개졌다. `utils/fetchError` 가 그 오분류를
 * 고쳐 이제는 "앱 문제예요" 라고 정직하게 말하지만, **정직한 오류보다 좋은 것은 오류가
 * 아예 없는 것이다.** 보내기 전에 막을 수 있는 것은 막는다.
 *
 * ## 값을 조용히 고치는 것과 요청을 막는 것을 구분한다
 *
 * - `zoom` 은 **고친다.** 카카오 level 은 정수 1~14 이고, 반올림·클램프로 잃는 정보가
 *   없다. 0.5 단위 level 을 주는 카카오 경로(모바일 더블탭 줌 도중의 `getLevel()`)나
 *   장래의 SDK 변경이 곧 400 이 되는 것을 막는다.
 * - `bbox 면적`·`거리순 기준점` 은 **막는다.** 여기서 상자를 몰래 줄이면 사용자가 보는
 *   지도와 결과의 범위가 달라지고, 기준점 없는 거리순을 추천순으로 몰래 바꾸면 사용자는
 *   `거리순` 을 눌렀는데 다른 순서를 받고 그 이유를 알 수 없다. 서버가 같은 이유로
 *   400 을 내는 곳이다(`mapParams.ts` 머리말, `assertDistanceSortHasAnchor`).
 *
 * ## 화면 상태와 이 관문은 **둘 다** 있어야 한다
 *
 * `sanitizeSortForLocation`(필터 훅)이 이미 좌표 없는 `거리순` 을 되돌린다. 그런데 그건
 * **이펙트**라서 렌더 한 번 늦고, 그 한 번에 질의가 이미 나간다 — 딥링크
 * `?sort=DISTANCE` 로 들어오거나 AI 검색이 `sort: "DISTANCE"` 를 돌려주면 400 한 발이
 * 반드시 나갔다. 그래서 훅은 `effectiveSort()` 로 **질의에 쓸 값**을 직접 고르고,
 * 서비스는 그래도 새어 나온 요청을 `assert…` 로 막는다. 관문이 하나면 새는 경로가 남는다.
 */

import { logger } from "@/src/lib/logger"

import type { LatLng, MapBounds, SortOption } from "../types"
import { MAP_ZOOM } from "../map/mapBridge"
import { DEFAULT_SORT } from "../data/filterCatalog"
import { MAX_BBOX_DIAGONAL_KM, bboxDiagonalKm } from "./bboxKey"

/* ══════════════════════════ 줌 ══════════════════════════ */

/**
 * 서버가 받는 `zoom` 으로 정규화한다. **정수 1~14 아닌 값을 보낼 수 없게 만드는 함수다.**
 *
 * 백엔드 정본: `sinsin-be-bun/src/domains/restaurant/mapParams.ts`
 * → `ZOOM_MIN = 1`, `ZOOM_MAX = 14`, `requireInt(…, DECIMAL_INTEGER)`.
 * 여기 값(`MAP_ZOOM.MIN` 1 / `MAP_ZOOM.MAX` 14)과 **같아야 한다** — 갈라지면 한쪽만
 * 통과하는 줌이 생기고 그게 곧 400 이다.
 *
 * 소수는 반올림한다(잘라내지 않는다). `4.6` 을 4 로 자르면 서버가 마커 모드로 계산한
 * 결과를 사용자는 클러스터 경계에서 본다 — 반올림이 화면에 가까운 쪽이다.
 * 유한수가 아니면(`NaN`/`undefined` 가 WebView 페이로드로 새어 들어온 경우) 기본 줌으로
 * 떨어뜨린다. `0` 을 보내 400 을 받는 것보다 "기본 줌으로 한 번 검색" 이 낫다.
 */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MAP_ZOOM.DEFAULT
  return Math.min(MAP_ZOOM.MAX, Math.max(MAP_ZOOM.MIN, Math.round(zoom)))
}

/* ══════════════════════════ 관문 오류 ══════════════════════════ */

/** 관문이 막은 이유. 화면은 `classifyFetchFailure` 를 통해 `REQUEST_REJECTED` 로 그린다. */
export type RequestGuardReason =
  /** bbox 대각이 서버 상한(200km)을 넘었다 → "지도를 확대해 주세요". */
  | "VIEWPORT_TOO_LARGE"
  /** `거리순` 인데 기준 좌표가 없다 → 서버가 `query.userLat missing` 을 낸다. */
  | "DISTANCE_SORT_WITHOUT_ANCHOR"

/**
 * 보내지 않고 막았다는 예외.
 *
 * 던지는 쪽이 곧 로그를 남긴다 — 이 오류는 사용자 화면에서 한 문장으로 요약되므로,
 * 어느 엔드포인트가 어떤 값 때문에 막혔는지 남기지 않으면 재현할 방법이 없다.
 * `RestaurantShapeError` 와 같은 방식이다(그쪽은 "잘못 받았다", 이쪽은 "잘못 보내려 했다").
 */
export class RestaurantRequestError extends Error {
  readonly reason: RequestGuardReason
  readonly endpoint: string

  constructor(reason: RequestGuardReason, endpoint: string, detail: string) {
    super(`${detail} (${endpoint})`)
    this.name = "RestaurantRequestError"
    this.reason = reason
    this.endpoint = endpoint
  }
}

export function isRestaurantRequestError(
  error: unknown,
): error is RestaurantRequestError {
  return error instanceof RestaurantRequestError
}

/* ══════════════════════════ 뷰포트 면적 ══════════════════════════ */

/**
 * bbox 대각이 서버 상한을 넘으면 **요청하지 않는다.**
 *
 * 상한 200km 의 정본은 `sinsin-be-bun/src/domains/restaurant/mapParams.ts` 의
 * `MAX_BBOX_DIAGONAL_KM = 200` 이고, 거리 식도 같은 등거리방형 근사(`KM_PER_DEG_LAT = 111.0`)
 * 여야 한다 — haversine 으로 바꾸면 경계에서 클라이언트와 서버 판정이 어긋나 "앱은 보냈는데
 * 서버가 거절" 하는 좁은 구간이 생긴다. 두 값은 `utils/bboxKey.ts` 에 있다.
 *
 * 화면은 이 상태를 미리 알고 pill 문구를 `지도를 확대해 주세요` 로 바꾼다
 * (`useMapSearch.isViewportTooLarge` → `MapRefreshPill.tooLarge`). 여기까지 온 요청은
 * 그 관문을 우회한 호출부라는 뜻이므로 조용히 통과시키지 않는다.
 */
export function assertViewportWithinCap(
  bounds: MapBounds,
  endpoint: string,
): void {
  const diagonal = bboxDiagonalKm(bounds)
  if (diagonal <= MAX_BBOX_DIAGONAL_KM) return
  logger.error(
    "[restaurant] 뷰포트가 서버 상한을 넘어 요청을 보내지 않았다",
    endpoint,
    `대각 ${Math.round(diagonal)}km > ${MAX_BBOX_DIAGONAL_KM}km`,
    `${bounds.swLat},${bounds.swLng},${bounds.neLat},${bounds.neLng}`,
  )
  throw new RestaurantRequestError(
    "VIEWPORT_TOO_LARGE",
    endpoint,
    `요청 영역이 너무 넓습니다(대각 ${Math.round(diagonal)}km, 상한 ${MAX_BBOX_DIAGONAL_KM}km)`,
  )
}

/* ══════════════════════════ 거리순 기준점 ══════════════════════════ */

/** `거리순` 만 기준 좌표가 필요하다. 서버 `assertDistanceSortHasAnchor` 와 같은 규칙이다. */
export function sortRequiresAnchor(sort: SortOption | undefined): boolean {
  return sort === "DISTANCE"
}

/**
 * 질의에 **실제로 쓸** 정렬. 좌표가 없으면 `거리순` 을 기본값으로 되돌린다.
 *
 * 훅이 이 함수를 통해 정렬을 고르므로 잘못된 요청이 애초에 조립되지 않는다.
 * 화면의 정렬 칩도 같은 규칙으로 되돌아간다(`sanitizeSortForLocation`) — 두 곳이 같은
 * 결론을 내야 "칩은 거리순인데 결과는 추천순" 이 되지 않는다. 규칙을 바꿀 일이 생기면
 * 두 함수를 함께 바꿀 것.
 */
export function effectiveSort(
  sort: SortOption | undefined,
  hasAnchor: boolean,
): SortOption | undefined {
  if (!sortRequiresAnchor(sort) || hasAnchor) return sort
  return DEFAULT_SORT
}

/**
 * 마지막 관문. `거리순` + 기준점 없음이면 요청을 보내지 않는다.
 *
 * 서버는 이 조합을 조용히 추천순으로 떨어뜨리지 않고 400 을 낸다(그 결정의 이유는
 * `mapService.ts::assertDistanceSortHasAnchor` 주석). 여기서 몰래 바꿔 보내면 그 결정을
 * 무력화하는 셈이므로, 값을 바꾸지 않고 던진다 — 훅이 `effectiveSort` 를 쓰는 정상 경로에서는
 * 도달할 수 없고, 도달했다면 새 호출부가 규칙을 모르고 있다는 뜻이다.
 */
export function assertSortHasAnchor(
  sort: SortOption | undefined,
  anchor: Partial<LatLng> | null | undefined,
  endpoint: string,
): void {
  if (!sortRequiresAnchor(sort)) return
  const hasAnchor =
    anchor !== null &&
    anchor !== undefined &&
    typeof anchor.lat === "number" &&
    typeof anchor.lng === "number"
  if (hasAnchor) return
  logger.error(
    "[restaurant] 기준 좌표 없는 거리순 요청을 보내지 않았다",
    endpoint,
    "effectiveSort() 를 거치지 않은 호출부가 있다",
  )
  throw new RestaurantRequestError(
    "DISTANCE_SORT_WITHOUT_ANCHOR",
    endpoint,
    "거리순은 내 위치 좌표가 있어야 합니다",
  )
}

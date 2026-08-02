/**
 * **요청 관문 회귀 테스트.**
 *
 * 이 기능은 서버가 400 으로 거절하는 요청을 계속 보내고 있었고, 화면은 그 400 을
 * "인터넷 연결을 확인해 주세요" 로 옮겨 적었다. 실측한 400 은 세 가지다
 * (`:8100`, 강남 376곳, 2026-07-30 — 아래 픽스처의 사유 문구는 서버 응답 그대로다).
 *
 *     GET /restaurants/map?…&zoom=4.5        → query.zoom  int_parsing
 *     GET /restaurants/map?…&zoom=0          → query.zoom  greater_than_equal
 *     GET /restaurants/map?…&zoom=15         → query.zoom  less_than_equal
 *     GET /restaurants/map?bbox(대각 561km)  → query.neLat value_error(200km)
 *     GET /restaurants/search?sort=DISTANCE  → query.userLat missing
 *
 * 여기서 고정하는 것은 **그 요청이 만들어질 수 없다는 사실**이다. 화면 상태를 되돌리는
 * 이펙트(`sanitizeSortForLocation`)는 한 렌더 늦어서 첫 요청 한 발을 막지 못했다 —
 * 그래서 질의를 조립하는 자리에서 값을 고르고, 서비스가 마지막으로 한 번 더 막는다.
 */

import {
  MAX_BBOX_DIAGONAL_KM,
  bboxDiagonalKm,
} from "../src/features/restaurant/utils/bboxKey"
import {
  RestaurantRequestError,
  assertSortHasAnchor,
  assertViewportWithinCap,
  clampZoom,
  effectiveSort,
  isRestaurantRequestError,
  sortRequiresAnchor,
} from "../src/features/restaurant/utils/requestGuards"
import { classifyFetchFailure } from "../src/features/restaurant/utils/fetchError"
import { ApiError } from "../src/services/core/apiError"
import type { MapBounds } from "../src/features/restaurant/types"

/** 실측한 강남 뷰포트(휴대폰 한 화면). 대각 약 2km 라 상한과 멀다. */
const GANGNAM: MapBounds = {
  swLat: 37.4921,
  swLng: 127.0219,
  neLat: 37.5037,
  neLng: 127.0333,
}

/** 실측으로 400 을 받은 상자. 서버 사유: "viewport diagonal must not exceed 200km". */
const TOO_WIDE: MapBounds = {
  swLat: 35.0,
  swLng: 125.0,
  neLat: 38.5,
  neLng: 129.5,
}

describe("zoom 은 정수 1~14 밖으로 나갈 수 없다", () => {
  it("소수는 반올림한다 — 4.5 는 int_parsing 400 이었다", () => {
    expect(clampZoom(4.5)).toBe(5)
    expect(clampZoom(4.4)).toBe(4)
    expect(Number.isInteger(clampZoom(6.7))).toBe(true)
  })

  it("아래로 벗어나면 1 — 0 은 greater_than_equal 400 이었다", () => {
    expect(clampZoom(0)).toBe(1)
    expect(clampZoom(-3)).toBe(1)
  })

  it("위로 벗어나면 14 — 15 는 less_than_equal 400 이었다", () => {
    expect(clampZoom(15)).toBe(14)
    expect(clampZoom(9999)).toBe(14)
  })

  it("유한수가 아니면 기본 줌으로 떨어진다 (WebView 페이로드는 검사되지 않은 값이다)", () => {
    expect(clampZoom(Number.NaN)).toBe(4)
    expect(clampZoom(undefined as unknown as number)).toBe(4)
    // 무한대는 "아주 먼 줌" 이 아니라 **깨진 값**이다. 14 로 조이면 앱이 전국 뷰포트를
    // 요청한 것처럼 굴게 되므로, NaN 과 같이 기본 줌으로 되돌린다.
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(4)
  })

  it("정상 범위는 건드리지 않는다", () => {
    for (const level of [1, 4, 6, 14]) expect(clampZoom(level)).toBe(level)
  })
})

describe("뷰포트 면적 상한은 백엔드와 같은 값이어야 한다", () => {
  it("상한은 200km — 백엔드 mapParams.ts 의 MAX_BBOX_DIAGONAL_KM 와 같은 값", () => {
    // 이 숫자가 바뀌면 백엔드도 함께 바뀌어야 한다. 한쪽만 바꾸면 앱이 보낸 요청을
    // 서버가 거절하는(또는 그 반대의) 구간이 생긴다.
    expect(MAX_BBOX_DIAGONAL_KM).toBe(200)
  })

  it("휴대폰 한 화면(강남)은 통과한다", () => {
    expect(bboxDiagonalKm(GANGNAM)).toBeLessThan(MAX_BBOX_DIAGONAL_KM)
    expect(() =>
      assertViewportWithinCap(GANGNAM, "GET /restaurants/map"),
    ).not.toThrow()
  })

  it("실측으로 400 을 받은 상자는 **보내기 전에** 막힌다", () => {
    expect(bboxDiagonalKm(TOO_WIDE)).toBeGreaterThan(MAX_BBOX_DIAGONAL_KM)
    let caught: unknown
    try {
      assertViewportWithinCap(TOO_WIDE, "GET /restaurants/map")
    } catch (error) {
      caught = error
    }
    expect(isRestaurantRequestError(caught)).toBe(true)
    expect((caught as RestaurantRequestError).reason).toBe("VIEWPORT_TOO_LARGE")
    // 어느 엔드포인트였는지가 남아야 재현할 수 있다.
    expect((caught as RestaurantRequestError).endpoint).toBe(
      "GET /restaurants/map",
    )
  })

  it("상한 바로 아래는 통과한다 — 경계에서 앱이 서버보다 엄격해지지 않는다", () => {
    // 위도만 1.8도(≈199.8km) 벌린 상자.
    const nearCap: MapBounds = {
      swLat: 36.0,
      swLng: 127.0,
      neLat: 37.8,
      neLng: 127.0,
    }
    expect(bboxDiagonalKm(nearCap)).toBeLessThanOrEqual(MAX_BBOX_DIAGONAL_KM)
    expect(() =>
      assertViewportWithinCap(nearCap, "GET /restaurants/search"),
    ).not.toThrow()
  })
})

describe("거리순은 기준 좌표 없이 나갈 수 없다", () => {
  it("기준점이 필요한 정렬은 DISTANCE 뿐이다", () => {
    expect(sortRequiresAnchor("DISTANCE")).toBe(true)
    for (const sort of [
      "RECOMMENDED",
      "RATING",
      "REVIEWS",
      "PRICE_HIGH",
      "PRICE_LOW",
      undefined,
    ] as const) {
      expect(sortRequiresAnchor(sort)).toBe(false)
    }
  })

  it("좌표가 없으면 질의에 쓰는 정렬이 추천순으로 돌아온다", () => {
    expect(effectiveSort("DISTANCE", false)).toBe("RECOMMENDED")
  })

  it("좌표가 있으면 거리순 그대로 나간다", () => {
    expect(effectiveSort("DISTANCE", true)).toBe("DISTANCE")
  })

  it("다른 정렬은 좌표 유무와 무관하게 그대로다", () => {
    for (const sort of ["RECOMMENDED", "RATING", "PRICE_LOW"] as const) {
      expect(effectiveSort(sort, false)).toBe(sort)
      expect(effectiveSort(sort, true)).toBe(sort)
    }
    expect(effectiveSort(undefined, false)).toBeUndefined()
  })

  it("그래도 새어 나온 요청은 서비스 관문이 막는다", () => {
    let caught: unknown
    try {
      assertSortHasAnchor("DISTANCE", null, "GET /restaurants/search")
    } catch (error) {
      caught = error
    }
    expect((caught as RestaurantRequestError).reason).toBe(
      "DISTANCE_SORT_WITHOUT_ANCHOR",
    )
  })

  it("좌표가 반쪽이면(위도만) 기준점이 아니다 — 서버도 그렇게 본다", () => {
    expect(() =>
      assertSortHasAnchor("DISTANCE", { lat: 37.5 }, "GET /restaurants/search"),
    ).toThrow(RestaurantRequestError)
  })

  it("좌표가 둘 다 있으면 통과한다", () => {
    expect(() =>
      assertSortHasAnchor(
        "DISTANCE",
        { lat: 37.4979, lng: 127.0276 },
        "GET /restaurants/search",
      ),
    ).not.toThrow()
  })
})

describe("관문이 막은 실패는 인터넷 문제로 보고되지 않는다", () => {
  it("관문 오류는 REQUEST_REJECTED 다 (우리 요청 결함)", () => {
    const error = new RestaurantRequestError(
      "VIEWPORT_TOO_LARGE",
      "GET /restaurants/map",
      "요청 영역이 너무 넓습니다",
    )
    expect(classifyFetchFailure(error, "map")).toBe("REQUEST_REJECTED")
  })

  it("실제 통신 실패만 NETWORK_FAILURE 다 — 두 갈래가 섞이면 안 된다", () => {
    const offline = new ApiError("네트워크", "NETWORK_ERROR", undefined, true)
    expect(classifyFetchFailure(offline, "map")).toBe("NETWORK_FAILURE")
  })
})

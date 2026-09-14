/**
 * 뷰포트를 react-query 키로 안정화한다.
 *
 * ## 왜 라운딩하나
 *
 * 카카오 `getBounds()` 는 배정도 부동소수를 그대로 준다. 손가락이 1픽셀만 스쳐도
 * `37.49790000000001` → `37.4979000000000_2` 처럼 값이 바뀌고, 그 값을 queryKey 에
 * 그대로 넣으면 **같은 화면인데 캐시가 갈린다.** 같은 영역을 다시 볼 때마다 새 요청이
 * 나가고, 이전 결과는 gcTime 까지 메모리에 남는다.
 *
 * 소수 5자리(≈1.1m)로 끊는다. 사람이 지도를 보고 "같은 영역" 이라고 인식하는 최소 단위보다
 * 훨씬 촘촘하므로 정확도를 잃지 않고, 부동소수 잡음은 전부 흡수된다.
 * 4자리(≈11m)까지 내리면 손가락을 살짝 옮긴 것도 캐시 히트가 되어 "현재 지도에서 찾기" 가
 * 아무 것도 안 하는 것처럼 보인다 — 그 경계 때문에 5자리다.
 */

import type { MapBounds } from "../types"

/** 소수 자리수. 1e-5도 ≈ 1.1m. 바꾸면 캐시 분해능이 바뀐다. */
const PRECISION = 5
const FACTOR = 10 ** PRECISION

/** 한 좌표를 5자리로 끊는다. `-0` 이 나오지 않게 `+ 0` 을 더한다(키 문자열이 갈린다). */
export function roundCoord(value: number): number {
  return Math.round(value * FACTOR) / FACTOR + 0
}

/** bbox 전체를 5자리로 끊은 새 객체. 원본을 수정하지 않는다. */
export function roundBounds(bounds: MapBounds): MapBounds {
  return {
    swLat: roundCoord(bounds.swLat),
    swLng: roundCoord(bounds.swLng),
    neLat: roundCoord(bounds.neLat),
    neLng: roundCoord(bounds.neLng),
  }
}

/**
 * queryKey 조각으로 쓸 문자열. 객체를 키에 넣어도 react-query 가 안정 직렬화를 하지만,
 * 문자열 하나로 두면 devtools 에서 눈으로 읽히고 diff 도 쉽다.
 */
export function bboxKey(bounds: MapBounds): string {
  const b = roundBounds(bounds)
  return `${b.swLat},${b.swLng},${b.neLat},${b.neLng}`
}

/*
  `sameBbox()` 는 여기 없다 (일부러 지웠다). pill 을 띄울지의 판정은
  `utils/viewportAction.resolveViewportAction` 이 `bboxKey` 문자열 비교로 하고 있어서,
  이 함수는 테스트만 부르고 있었다.
*/

/**
 * bbox 대각 거리(km). 서버가 200km 초과를 400 으로 거절하므로 **보내기 전에** 걸러
 * 사용자에게 헛된 실패를 보여 주지 않는다.
 *
 * 거리 공식은 백엔드와 같은 등거리방형 근사다(`KM_PER_DEG_LAT = 111.0`).
 * haversine 으로 바꾸면 경계에서 클라이언트와 서버 판정이 어긋난다.
 */
const KM_PER_DEG_LAT = 111.0

export function bboxDiagonalKm(bounds: MapBounds): number {
  const latMid = (bounds.swLat + bounds.neLat) / 2
  const dLat = (bounds.neLat - bounds.swLat) * KM_PER_DEG_LAT
  const dLng =
    (bounds.neLng - bounds.swLng) *
    KM_PER_DEG_LAT *
    Math.cos((latMid * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/**
 * 서버 상한과 **같은 값**. 정본은 백엔드이고, 실측으로 확인한 값이다.
 *
 *     sinsin-be-bun/src/domains/restaurant/mapParams.ts
 *       MAX_BBOX_DIAGONAL_KM = 200   ← 이 값과 같아야 한다
 *       KM_PER_DEG_LAT       = 111.0 ← 위 상수와 같아야 한다
 *
 * 실측(2026-07-30, `:8100`): 대각 561km bbox →
 * `400 query.neLat value_error "viewport diagonal must not exceed 200km"`.
 * 여기를 키우면 그 400 이 사용자에게 그대로 보이고, 줄이면 서버는 받는 영역을 앱이
 * 거절한다. 한쪽만 바꾸지 말 것.
 */
export const MAX_BBOX_DIAGONAL_KM = 200

export function isBboxTooLarge(bounds: MapBounds): boolean {
  return bboxDiagonalKm(bounds) > MAX_BBOX_DIAGONAL_KM
}

/**
 * 남서/북동이 뒤집힌 bbox 를 바로잡는다. 카카오는 정상적으로 주지만, 회전·리사이즈
 * 직후 한 프레임에 뒤집힌 값이 관측된 적이 있다. 서버는 뒤집힘을 스왑하거나 400 을 내므로
 * 클라이언트에서 미리 정규화해 **요청이 낭비되지 않게** 한다.
 */
export function normalizeBounds(bounds: MapBounds): MapBounds {
  return {
    swLat: Math.min(bounds.swLat, bounds.neLat),
    neLat: Math.max(bounds.swLat, bounds.neLat),
    swLng: Math.min(bounds.swLng, bounds.neLng),
    neLng: Math.max(bounds.swLng, bounds.neLng),
  }
}

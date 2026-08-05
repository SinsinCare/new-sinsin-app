/**
 * 카카오맵이 실제 타일을 가진 영역 — 대한민국 전역을 넉넉히 덮는 직사각형.
 *
 * 카카오 지도는 국내 전용이다. 카메라가 이 밖으로 나가면 SDK 는 오류 없이
 * **빈 베이지 타일**(kakaomap 워터마크만 있는)을 그린다 — 사용자에게는 "지도가
 * 회색으로 죽었다" 로 보인다(실측 2026-08-05: iOS 시뮬레이터의 기본 모의 위치가
 * 미국이라 `내 위치` 버튼 한 번에 재현된다. 해외 사용자 실기기도 동일하다).
 *
 * 경계는 행정 경계가 아니라 **타일 유무의 근사**라 넉넉하게 잡는다:
 * 남쪽 33.0(마라도 33.11), 북쪽 38.7(고성 38.61), 서쪽 124.5(백령도 124.66),
 * 동쪽 132.0(독도 131.87). 북한 지역은 카카오가 개략 타일을 갖고 있고, 이 판정의
 * 목적은 "빈 타일 앞에 사용자를 세우지 않는 것"이지 국경 판정이 아니다.
 */
export const KAKAO_COVERAGE = {
  minLat: 33.0,
  maxLat: 38.7,
  minLng: 124.5,
  maxLng: 132.0,
} as const

/** 좌표가 카카오맵 타일이 있는 영역 안인가. 카메라를 옮기기 전에 물을 것. */
export function isWithinKakaoCoverage(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= KAKAO_COVERAGE.minLat &&
    lat <= KAKAO_COVERAGE.maxLat &&
    lng >= KAKAO_COVERAGE.minLng &&
    lng <= KAKAO_COVERAGE.maxLng
  )
}

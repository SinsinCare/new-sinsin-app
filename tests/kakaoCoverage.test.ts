import {
  KAKAO_COVERAGE,
  isWithinKakaoCoverage,
} from "../src/features/restaurant/utils/kakaoCoverage"

describe("kakao map coverage", () => {
  it.each([
    ["서울", 37.5665, 126.978],
    ["부산", 35.1796, 129.0756],
    ["제주 마라도", 33.117, 126.268],
    ["독도", 37.24, 131.87],
    ["백령도", 37.96, 124.66],
    ["강원 고성", 38.61, 128.35],
  ])("국내는 안이다: %s", (_name, lat, lng) => {
    expect(isWithinKakaoCoverage(lat as number, lng as number)).toBe(true)
  })

  it.each([
    // 시뮬레이터 기본 모의 위치(미국)가 이 갈래다 — 실측 2026-08-05, 빈 베이지 타일.
    ["샌프란시스코", 37.7749, -122.4194],
    ["쿠퍼티노", 37.3349, -122.009],
    ["도쿄", 35.6762, 139.6503],
    ["베이징", 39.9042, 116.4074],
    ["시드니", -33.8688, 151.2093],
  ])("해외는 밖이다: %s", (_name, lat, lng) => {
    expect(isWithinKakaoCoverage(lat as number, lng as number)).toBe(false)
  })

  it("숫자가 아니면 밖이다 — NaN 좌표로 카메라를 옮기지 않는다", () => {
    expect(isWithinKakaoCoverage(Number.NaN, 126.978)).toBe(false)
    expect(isWithinKakaoCoverage(37.5665, Number.NaN)).toBe(false)
  })

  it("경계는 포함이다", () => {
    expect(
      isWithinKakaoCoverage(KAKAO_COVERAGE.minLat, KAKAO_COVERAGE.minLng),
    ).toBe(true)
    expect(
      isWithinKakaoCoverage(KAKAO_COVERAGE.maxLat, KAKAO_COVERAGE.maxLng),
    ).toBe(true)
  })
})

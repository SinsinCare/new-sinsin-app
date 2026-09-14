/**
 * 거리 표기. 목업 §2.8 의 `2.6km` / `620m` 두 형식.
 *
 * ## `null` 은 `0` 이 아니다
 *
 * 위치 권한이 없으면 서버가 `distanceKm: null` 을 준다. 그때 `0km` 나 `-` 를 그리면
 * "아주 가깝다" 또는 "데이터 오류" 로 읽힌다. 정답은 **거리 줄 자체를 감추는 것**이라
 * 이 함수도 `null` 을 그대로 돌려준다. 호출부는 `null` 이면 그 줄을 렌더하지 않는다.
 *
 * ## 1km 미만은 10m 단위로 끊는다
 *
 * 서버가 주는 값은 소수 둘째 자리까지의 km(`0.62`)다. `617m` 처럼 1m 단위로 쓰면
 * 등거리방형 근사(`KM_PER_DEG_LAT = 111.0`)가 갖지 않은 정밀도를 주장하게 된다.
 * 이 근사는 서울 위도에서 수십 m 오차가 있다. 목업도 `620m` 로 10m 단위다.
 *
 * 거리 **계산식은 손대지 않는다** — 백엔드 테스트가 0.5km·1.27km 경계를 단언하고 있어
 * haversine 으로 바꾸면 화면의 모든 거리가 흔들린다.
 */

/** 미터 표기로 내려가는 경계. 이 값 미만이면 `m`, 이상이면 `km`. */
const METER_THRESHOLD_KM = 1

/** 미터 표기의 눈금. 10m 단위로 끊어 없는 정밀도를 주장하지 않는다. */
const METER_STEP = 10

/**
 * `0.62` → `"620m"`, `2.64` → `"2.6km"`, `null` → `null`.
 *
 * 음수는 있을 수 없는 값이므로 `null` 로 떨군다 — 화면에 `-1.2km` 를 그리는 대신
 * 조용히 줄을 감춘다.
 */
export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km === null || km === undefined) return null
  if (!Number.isFinite(km) || km < 0) return null

  if (km < METER_THRESHOLD_KM) {
    const meters = Math.round((km * 1000) / METER_STEP) * METER_STEP
    // 0.004km 처럼 반올림이 0 으로 떨어지면 "0m" 대신 최소 눈금을 쓴다.
    return `${Math.max(meters, METER_STEP)}m`
  }

  // toFixed(1) 은 `10.0km` 처럼 무의미한 소수를 남길 수 있다. 정수면 정수로 쓴다.
  const rounded = Math.round(km * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}km`
}

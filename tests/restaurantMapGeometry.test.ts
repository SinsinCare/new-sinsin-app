/**
 * 거리 표기와 뷰포트 키. 둘 다 "없는 정밀도를 주장하지 않는다" 는 같은 규칙을 지킨다.
 *
 * bbox 키의 라운딩은 **캐시 분해능**이다. 여기서 자리수를 건드리면
 * (a) 너무 촘촘하면 손가락이 1픽셀 스칠 때마다 캐시가 갈려 같은 화면을 다시 받아 오고
 * (b) 너무 굵으면 지도를 옮겼는데 `현재 지도에서 찾기` 가 아무 일도 안 하는 것처럼 보인다.
 * 그래서 임계값 위/아래를 둘 다 단언한다.
 */

import i18n from "../src/i18n"
import type { MapBounds } from "../src/features/restaurant/types"
import {
  distanceAccessibility,
  formatDistanceKm,
} from "../src/features/restaurant/utils/distance"
import {
  MAX_BBOX_DIAGONAL_KM,
  bboxDiagonalKm,
  bboxKey,
  isBboxTooLarge,
  normalizeBounds,
  roundBounds,
  roundCoord,
  sameBbox,
} from "../src/features/restaurant/utils/bboxKey"

/** 시드 데이터가 있는 강남 한 블록. */
const GANGNAM: MapBounds = {
  swLat: 37.4906,
  swLng: 127.0197,
  neLat: 37.5053,
  neLng: 127.0367,
}

describe("거리 표기 — 1km 경계", () => {
  it("1km 미만은 m 로, 10m 단위로 끊는다", () => {
    expect(formatDistanceKm(0.62)).toBe("620m")
    expect(formatDistanceKm(0.617)).toBe("620m")
    expect(formatDistanceKm(0.05)).toBe("50m")
    // 등거리방형 근사(111.0km/도)는 1m 정밀도를 갖지 않는다. `617m` 라고 쓰면 거짓 주장이다.
    expect(formatDistanceKm(0.617)).not.toBe("617m")
  })

  it("1km 이상은 km 로 쓴다", () => {
    expect(formatDistanceKm(1)).toBe("1km")
    expect(formatDistanceKm(2.64)).toBe("2.6km")
    expect(formatDistanceKm(2.66)).toBe("2.7km")
    // `10.0km` 처럼 무의미한 소수를 남기지 않는다.
    expect(formatDistanceKm(10)).toBe("10km")
    expect(formatDistanceKm(10.04)).toBe("10km")
  })

  it("경계 바로 아래는 m, 경계는 km 다", () => {
    expect(formatDistanceKm(0.999)).toBe("1000m")
    expect(formatDistanceKm(1.0)).toBe("1km")
  })

  it("반올림이 0 으로 떨어져도 `0m` 를 쓰지 않는다", () => {
    // "0m" 는 "여기가 바로 그곳" 으로 읽힌다. 최소 눈금이 정직하다.
    expect(formatDistanceKm(0.004)).toBe("10m")
    expect(formatDistanceKm(0)).toBe("10m")
  })

  it("null 은 0 이 아니라 null 이다 — 호출부가 거리 줄을 감춘다", () => {
    // 위치 권한이 없으면 서버가 null 을 준다. `0km` 를 그리면 "아주 가깝다" 로 읽힌다.
    expect(formatDistanceKm(null)).toBeNull()
    expect(formatDistanceKm(undefined)).toBeNull()
  })

  it("있을 수 없는 값은 조용히 감춘다", () => {
    expect(formatDistanceKm(-1.2)).toBeNull()
    expect(formatDistanceKm(Number.NaN)).toBeNull()
    expect(formatDistanceKm(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe("거리 접근성 문구", () => {
  it("단위를 말로 준다 — `620m` 를 그대로 읽히면 '육백이십엠' 이 된다", () => {
    expect(distanceAccessibility(0.62)).toEqual({
      labelKey: "restaurant.distance.meters",
      params: { value: "620" },
    })
    expect(distanceAccessibility(2.64)).toEqual({
      labelKey: "restaurant.distance.kilometers",
      params: { value: "2.6" },
    })
    expect(distanceAccessibility(null)).toBeNull()
    expect(distanceAccessibility(-3)).toBeNull()
  })

  it("표기와 접근성이 같은 숫자를 말한다", () => {
    for (const km of [0.004, 0.62, 0.999, 1, 2.64, 10]) {
      const text = formatDistanceKm(km) as string
      const a11y = distanceAccessibility(km)
      expect(text).toContain(a11y?.params.value as string)
    }
  })

  it("두 키가 ko/en 둘 다에 있다", async () => {
    for (const language of ["ko", "en"] as const) {
      await i18n.changeLanguage(language)
      expect(i18n.t("restaurant.distance.meters", { value: "620" })).toContain(
        "620",
      )
      expect(
        i18n.t("restaurant.distance.kilometers", { value: "2.6" }),
      ).toContain("2.6")
    }
    await i18n.changeLanguage("ko")
  })
})

describe("bbox 키 — 라운딩 임계값 위/아래", () => {
  it("임계값(1e-5) 아래로 다른 두 뷰포트는 같은 키다", () => {
    // 카카오 getBounds() 는 배정도 부동소수를 그대로 준다. 손가락이 1픽셀 스친 잡음으로
    // 캐시가 갈리면 같은 영역을 다시 볼 때마다 새 요청이 나간다.
    const jittered: MapBounds = {
      swLat: GANGNAM.swLat + 0.0000001,
      swLng: GANGNAM.swLng - 0.00000009,
      neLat: GANGNAM.neLat + 0.0000002,
      neLng: GANGNAM.neLng - 0.0000003,
    }
    expect(bboxKey(jittered)).toBe(bboxKey(GANGNAM))
    expect(sameBbox(jittered, GANGNAM)).toBe(true)
  })

  it("임계값 위로 다른 두 뷰포트는 다른 키다", () => {
    // 4자리(≈11m)까지 굵어지면 지도를 옮겼는데 캐시 히트가 되어
    // `현재 지도에서 찾기` 가 아무 것도 안 하는 것처럼 보인다.
    const moved: MapBounds = { ...GANGNAM, swLat: GANGNAM.swLat + 0.0001 }
    expect(bboxKey(moved)).not.toBe(bboxKey(GANGNAM))
    expect(sameBbox(moved, GANGNAM)).toBe(false)

    // 5자리 자체가 갈리는 최소 변화(1e-5 ≈ 1.1m)도 다른 키여야 한다.
    const oneUnit: MapBounds = { ...GANGNAM, neLng: GANGNAM.neLng + 0.00001 }
    expect(bboxKey(oneUnit)).not.toBe(bboxKey(GANGNAM))
  })

  it("키는 눈으로 읽히는 문자열 하나다", () => {
    expect(bboxKey(GANGNAM)).toBe("37.4906,127.0197,37.5053,127.0367")
  })

  it("`-0` 이 키를 갈라놓지 않는다", () => {
    // Math.round(-0.0000001 * 1e5)/1e5 는 `-0` 이고, 템플릿 문자열에서 `"-0"` 이 된다.
    expect(roundCoord(-0.0000001)).toBe(0)
    expect(String(roundCoord(-0.0000001))).toBe("0")
  })

  it("roundBounds 는 원본을 고치지 않는다", () => {
    const original = { ...GANGNAM, swLat: 37.49061111 }
    const rounded = roundBounds(original)
    expect(rounded.swLat).toBe(37.49061)
    expect(original.swLat).toBe(37.49061111)
  })

  it("null 뷰포트는 같다고 하지 않는다", () => {
    // 최초 진입(아직 idle 이 없다)에서 `같다` 로 판정하면 pill 이 영원히 안 뜬다.
    expect(sameBbox(null, GANGNAM)).toBe(false)
    expect(sameBbox(GANGNAM, null)).toBe(false)
    expect(sameBbox(null, null)).toBe(false)
  })
})

describe("bbox 면적 상한 — 서버 400 을 미리 막는다", () => {
  it("강남 한 블록은 2km 대각이다", () => {
    const diagonal = bboxDiagonalKm(GANGNAM)
    expect(diagonal).toBeGreaterThan(1.5)
    expect(diagonal).toBeLessThan(3)
    expect(isBboxTooLarge(GANGNAM)).toBe(false)
  })

  it("전국 스캔은 보내기 전에 걸러진다", () => {
    const wholeCountry: MapBounds = {
      swLat: 33,
      swLng: 125,
      neLat: 38.6,
      neLng: 131,
    }
    expect(bboxDiagonalKm(wholeCountry)).toBeGreaterThan(MAX_BBOX_DIAGONAL_KM)
    expect(isBboxTooLarge(wholeCountry)).toBe(true)
  })

  it("상한은 서버와 같은 200km 다", () => {
    // 여기를 바꾸면 백엔드도 같이 바꿔야 한다. 한쪽만 바꾸면 사용자는 헛된 400 을 본다.
    expect(MAX_BBOX_DIAGONAL_KM).toBe(200)
  })
})

describe("뒤집힌 bbox 정규화", () => {
  it("남서/북동이 바뀌어 와도 스왑해 보낸다", () => {
    // 회전·리사이즈 직후 한 프레임에 뒤집힌 값이 관측된 적이 있다. 그대로 보내면 400 이다.
    const flipped: MapBounds = {
      swLat: GANGNAM.neLat,
      swLng: GANGNAM.neLng,
      neLat: GANGNAM.swLat,
      neLng: GANGNAM.swLng,
    }
    expect(normalizeBounds(flipped)).toEqual(GANGNAM)
  })

  it("정상 bbox 는 그대로 둔다", () => {
    expect(normalizeBounds(GANGNAM)).toEqual(GANGNAM)
  })
})

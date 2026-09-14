/**
 * 안전도 배지. 신장 환자에게 **미판정을 안전으로 승격하는 방향의 오류**가 가장 위험하므로
 * 그 한 가지를 여러 각도에서 못 박는다(배지 없음 / 라벨 / 스크린리더 문자열).
 */

import i18n from "../src/i18n"
import { resolveTheme } from "../src/design-system-v2/theme"
import {
  commonValue,
  hasCommonKeyInBothLocales,
} from "./helpers/i18nResourceKeys"
import type {
  SafetyDriver,
  SafetyLevel,
} from "../src/features/restaurant/types"
import {
  safetyBadge,
  safetyBadgeOrUnknown,
} from "../src/features/restaurant/utils/safetyBadge"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

const DRIVERS: SafetyDriver[] = ["sodium", "potassium", "phosphorus", "protein"]

describe("등급 → 배지 색·라벨", () => {
  it("제한은 적색 계열이다", () => {
    expect(safetyBadge("RESTRICTED", light)).toEqual({
      level: "RESTRICTED",
      labelKey: "restaurant.safety.RESTRICTED",
      bg: light.accentForeground.redWeak,
      fg: light.status.negative,
    })
  })

  it("주의는 앰버 계열이다 — 면에 쓰는 status.cautionary 를 전경으로 쓰지 않는다", () => {
    const badge = safetyBadge("CAUTION", light)
    expect(badge).toEqual({
      level: "CAUTION",
      labelKey: "restaurant.safety.CAUTION",
      bg: light.accentForeground.orangeWeak,
      fg: light.accentForeground.orange,
    })
    // #ffa938 을 전경에 쓰면 흰 배경에서 읽히지 않는다.
    expect(badge?.fg).not.toBe(light.status.cautionary)
  })

  it("안전은 녹색 계열이다", () => {
    expect(safetyBadge("SAFE", light)).toEqual({
      level: "SAFE",
      labelKey: "restaurant.safety.SAFE",
      // 안전은 그레이스케일 — 색은 주의·제한에만(2026-09-11 제품 결정).
      bg: light.fill.normal,
      fg: light.label.neutral,
    })
  })

  it("세 등급이 서로 다른 색을 쓴다", () => {
    const colors = (["RESTRICTED", "CAUTION", "SAFE"] as SafetyLevel[]).map(
      (level) => safetyBadge(level, light)?.fg,
    )
    expect(new Set(colors).size).toBe(3)
  })

  it("다크모드에서도 하드코딩 hex 가 아니라 토큰을 따라간다", () => {
    // 목업에서 눈으로 뽑은 #DC2626/#FEE2E2 를 박아 두면 검은 배경에 파스텔 배지가 남는다.
    const lightBadge = safetyBadge("RESTRICTED", light)
    const darkBadge = safetyBadge("RESTRICTED", dark)
    expect(darkBadge?.fg).toBe(dark.status.negative)
    expect(darkBadge?.fg).not.toBe(lightBadge?.fg)
  })
})

describe("UNKNOWN 은 배지를 만들지 않고, 절대 `안전` 이 아니다", () => {
  it("safetyBadge() 가 null 이라 호출부는 배지를 그리지 않는다", () => {
    expect(safetyBadge("UNKNOWN", light)).toBeNull()
  })

  it("자리를 비울 수 없는 곳에서만 회색 `정보 없음` 배지를 명시적으로 요청한다", () => {
    const badge = safetyBadgeOrUnknown("UNKNOWN", light)
    expect(badge).toEqual({
      level: "UNKNOWN",
      labelKey: "restaurant.safety.UNKNOWN",
      bg: light.fill.normal,
      fg: light.label.neutral,
    })
    // 초록으로 승격되지 않는다.
    expect(badge.fg).not.toBe(light.accentForeground.green)
    expect(badge.labelKey).not.toBe("restaurant.safety.SAFE")
  })

  it("라벨이 `안전` 으로 번역되지 않는다", async () => {
    await i18n.changeLanguage("ko")
    expect(i18n.t("restaurant.safety.UNKNOWN")).toBe("정보 없음")
    expect(i18n.t("restaurant.safety.UNKNOWN")).not.toContain("안전")
    await i18n.changeLanguage("en")
    expect(i18n.t("restaurant.safety.UNKNOWN").toLowerCase()).not.toContain(
      "safe",
    )
    await i18n.changeLanguage("ko")
  })

  it("모르는 값이 들어와도 SAFE 로 떨어지지 않는다", () => {
    // 서버가 새 등급을 추가했을 때 조용히 `안전` 이 되는 것이 가장 위험한 실패다.
    const unexpected = "PROBABLY_FINE" as SafetyLevel
    const badge = safetyBadgeOrUnknown(unexpected, light)
    expect(badge.level).toBe("UNKNOWN")
    expect(badge.labelKey).toBe("restaurant.safety.UNKNOWN")
  })
})

/*
  등급별 마커 링 색을 단언하던 describe 가 여기 있었다. 지웠다 — 목업(-2/-5/-7)의 마커는
  등급과 무관하게 전부 같은 브랜드 주황 링이고, `safetyMarkerColor()` 는 호출부가 하나도
  없는 채로 계약만 약속하고 있었다. 마커의 등급은 색이 아니라 접근성 라벨로 전달된다
  (`map/mapBridge.ts` 의 `MapStrings`, `tests/restaurantMapBridge.test.ts` 가 그쪽을 잡는다).
*/

describe("판정 근거 영양소", () => {
  it("네 영양소 키가 ko/en 둘 다에 있다", () => {
    // 화면(`RestaurantCard`·`SafetyBadge`)이 이 모양으로 키를 직접 조립한다.
    for (const driver of DRIVERS) {
      expect(
        hasCommonKeyInBothLocales(`restaurant.safety.driver.${driver}`),
      ).toBe(true)
    }
  })
})

describe("등급 라벨 i18n", () => {
  it.each(["RESTRICTED", "CAUTION", "SAFE", "UNKNOWN"] as SafetyLevel[])(
    "%s 라벨이 ko/en 둘 다에 있다",
    (level) => {
      // 색만으로 뜻을 전하지 않기 위해 라벨을 항상 함께 그린다 — 키가 없으면 그게 깨진다.
      expect(hasCommonKeyInBothLocales(`restaurant.safety.${level}`)).toBe(true)
    },
  )

  it("등급 라벨이 서로 다른 문구다", () => {
    const labels = (["RESTRICTED", "CAUTION", "SAFE", "UNKNOWN"] as const).map(
      (level) => commonValue(`restaurant.safety.${level}`, "ko"),
    )
    expect(new Set(labels).size).toBe(4)
  })
})

/*
  카드 요약 배지(`cardSafetyBadges`)와 판정 상태(`cardSafetyState`)를 단언하던 describe 가
  여기 있었다. 카드가 제목 옆 영양소 배지(`cardConcernNutrients`,
  `tests/restaurantConcernBadges.test.ts`)만 그리게 바뀐 뒤 두 함수는 호출부 없이
  계약만 약속하고 있어 함께 지웠다(`utils/cardSafetyBadge.ts` 헤더 §여기 없는 것).
*/

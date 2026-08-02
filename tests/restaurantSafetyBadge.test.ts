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
  RestaurantSafetyDto,
  SafetyDriver,
  SafetyLevel,
} from "../src/features/restaurant/types"
import {
  cardSafetyBadges,
  cardSafetyState,
  showsAnalysisPendingChip,
} from "../src/features/restaurant/utils/cardSafetyBadge"
import {
  safetyAccessibilityKeys,
  safetyBadge,
  safetyBadgeOrUnknown,
  safetyDriverLabelKey,
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
      bg: light.accentForeground.greenWeak,
      fg: light.accentForeground.green,
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

  it("스크린리더 문자열도 UNKNOWN 을 그대로 말한다", () => {
    expect(safetyAccessibilityKeys("UNKNOWN", null)).toEqual({
      labelKey: "restaurant.safety.UNKNOWN",
      driverLabelKey: null,
    })
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
  it("근거가 있으면 키를, 없으면 null 을 준다", () => {
    expect(safetyDriverLabelKey("sodium")).toBe(
      "restaurant.safety.driver.sodium",
    )
    expect(safetyDriverLabelKey(null)).toBeNull()
  })

  it("네 영양소 키가 ko/en 둘 다에 있다", () => {
    for (const driver of DRIVERS) {
      expect(
        hasCommonKeyInBothLocales(safetyDriverLabelKey(driver) as string),
      ).toBe(true)
    }
  })

  it("접근성 한 줄은 등급 키와 근거 키를 함께 준다", () => {
    expect(safetyAccessibilityKeys("RESTRICTED", "potassium")).toEqual({
      labelKey: "restaurant.safety.RESTRICTED",
      driverLabelKey: "restaurant.safety.driver.potassium",
    })
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

/**
 * 판정 상태 — **전국 확장의 전제**.
 *
 * 오늘 데이터(강남 376곳)는 메뉴 영양이 100% 있어서 "배지 없음" 이 사실상 프로필 없음
 * 하나였다. 장소를 전국으로 넓히면 **우리가 메뉴를 모르는 가게가 대다수**가 되고, 그때
 * 빈 배지 자리는 정직한 게 아니라 아무 말도 하지 않는 것이다 — 사용자가 "이 앱이 확인한
 * 곳" 과 "그냥 지도에 있는 곳" 을 구별할 수 없게 된다.
 */
describe("cardSafetyState — 왜 배지가 없는가", () => {
  const safety = (over: Partial<RestaurantSafetyDto>): RestaurantSafetyDto =>
    ({
      level: "UNKNOWN",
      menuCount: 0,
      safeMenuCount: 0,
      cautionMenuCount: 0,
      restrictedMenuCount: 0,
      unknownMenuCount: 0,
      hasSafeMenu: false,
      driverCounts: {},
      profileMissing: false,
      ...over,
    }) as RestaurantSafetyDto

  it("메뉴를 모르면 `ANALYSIS_PENDING` — 우리가 할 일이 남은 상태다", () => {
    expect(cardSafetyState(safety({ menuCount: 0 }))).toBe("ANALYSIS_PENDING")
    expect(showsAnalysisPendingChip(safety({ menuCount: 0 }))).toBe(true)
  })

  it("메뉴는 아는데 판정이 안 서면 `UNJUDGED` — 사용자가 할 수 있는 일이 없어 비워 둔다", () => {
    const s = safety({ menuCount: 5, unknownMenuCount: 5 })
    expect(cardSafetyState(s)).toBe("UNJUDGED")
    expect(showsAnalysisPendingChip(s)).toBe(false)
  })

  it("프로필이 없으면 그 사실이 먼저다 (판정을 노출하지 않는다)", () => {
    const s = safety({ profileMissing: true, menuCount: 0 })
    expect(cardSafetyState(s)).toBe("PROFILE_MISSING")
    expect(showsAnalysisPendingChip(s)).toBe(false)
  })

  it("판정이 있으면 `JUDGED`", () => {
    expect(cardSafetyState(safety({ level: "SAFE", menuCount: 3 }))).toBe(
      "JUDGED",
    )
  })

  it("`safety` 자체가 없는 목록(저장한 곳)은 분석 전이 아니다 — 그 화면이 안 물어본 것이다", () => {
    expect(cardSafetyState(null)).toBe("UNJUDGED")
    expect(showsAnalysisPendingChip(undefined)).toBe(false)
  })

  it("어느 경우에도 SAFE 로 승격하지 않는다", () => {
    for (const s of [
      safety({ menuCount: 0 }),
      safety({ menuCount: 5, unknownMenuCount: 5 }),
      safety({ profileMissing: true }),
    ]) {
      expect(cardSafetyBadges(s).level).toBeNull()
    }
  })
})

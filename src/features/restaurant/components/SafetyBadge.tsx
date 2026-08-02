/**
 * 안전도 배지 (`제한` / `주의` / `안전` / `정보 없음`).
 *
 * ## 색·라벨을 여기서 정하지 않는다
 *
 * 전부 `utils/safetyBadge` 가 결정한다. 이 컴포넌트는 그 결과를 그리는 일만 한다.
 * 색 매핑이 두 곳에 있으면 지도 마커와 카드 배지가 서로 다른 색으로 같은 등급을
 * 말하게 되고, 사용자는 둘을 연결하지 못한다.
 *
 * ## `UNKNOWN` 은 기본적으로 아무 것도 그리지 않는다
 *
 * `safetyBadge()` 가 `null` 을 주면 `null` 을 반환한다. 미판정을 회색 배지로라도
 * 채우고 싶으면 호출부가 `showUnknown` 을 **명시적으로** 켜야 한다 — 메뉴 목록처럼
 * 배지 열이 세로로 정렬돼야 하는 곳뿐이다. 미판정을 `안전` 쪽으로 오해하게 만드는
 * 방향의 실수가 신장 환자에게 가장 위험하므로 기본값을 그쪽으로 두지 않는다.
 *
 * ## 목업 값 → 토큰 근사 (되돌리지 말 것)
 *
 * 목업의 배지는 `radius 6 / 11px Bold` 다. v2 사다리에 6 도 11px Bold 도 없어
 * `radius.sm`(8) + `caption.small`(11 Medium) 로 스냅했다. `fontWeight` 를 얹어
 * Bold 를 흉내내면 iOS 에서 가짜 볼드가 되므로 굵기는 포기하고 크기를 맞췄다.
 */

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { radius, spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { SafetyDriver, SafetyLevel } from "../types"
import { safetyBadge, safetyBadgeOrUnknown } from "../utils/safetyBadge"

/** size → 치수 + 타이포. 모듈 레벨 룩업(인라인 조건 금지 규칙). */
const SIZE = {
  s: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: radius.xs,
    text: typography.caption.xSmall, // 10
  },
  m: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
    borderRadius: radius.sm, // 목업 6 → 사다리 최근접
    text: typography.caption.small, // 11
  },
} as const

export type SafetyBadgeSize = keyof typeof SIZE

export interface SafetyBadgeProps {
  level: SafetyLevel
  /** 판정을 주도한 영양소. 스크린리더 문구에만 쓰고 화면에는 그리지 않는다. */
  driver?: SafetyDriver | null
  /** `UNKNOWN` 도 회색 `정보 없음` 배지로 그린다. 기본값 `false`. */
  showUnknown?: boolean
  size?: SafetyBadgeSize
  style?: ViewStyle
}

export function SafetyBadge({
  level,
  driver = null,
  showUnknown = false,
  size = "m",
  style,
}: SafetyBadgeProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  const badge = showUnknown
    ? safetyBadgeOrUnknown(level, colors)
    : safetyBadge(level, colors)
  if (!badge) return null

  const s = SIZE[size]
  const label = t(dynamicKey(badge.labelKey))
  // 색만으로 뜻을 전하지 않는다 — 라벨을 함께 그리고, 근거가 있으면 리더에 덧붙인다.
  const accessibilityLabel = driver
    ? t("restaurant.safety.driverAccessibility", {
        driver: t(dynamicKey(`restaurant.safety.driver.${driver}`)),
        label,
      })
    : t("restaurant.safety.accessibility", { label })

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
          borderRadius: s.borderRadius,
          backgroundColor: badge.bg,
        },
        style,
      ]}
    >
      <Text style={[s.text, { color: badge.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // 내용 크기에 붙는다(hug). 카드/메뉴 행에서 남은 폭을 먹지 않게.
  base: { alignSelf: "flex-start" },
})

import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { BadgeLevel } from "../types/report"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 상태 배지의 색 규칙 — 여기 한 곳에서만 정한다.
 *
 * 면은 흰 카드만 쓰는 화면이라 상태는 배지가 전부 말한다:
 * 기준 안/줄어듦=그레이 면, 확인 필요=진한 그레이 면,
 * **빠른 확인만 채운 레드+흰 글자**
 * (화면에서 유일한 유채색 면), 기록 부족=면 없이 테두리만.
 * 배지가 늘어도 화면이 경고로 얼룩지지 않는 이유다.
 */
function badgeTone(level: BadgeLevel, s: Surface) {
  return level === "DANGER" || level === "WORSE"
    ? s.danger
    : level === "CAUTION"
      ? s.brand
      : s.textMuted
}

export function StatusBadge({
  level,
  label,
  s,
}: {
  level: BadgeLevel
  label: string
  s: Surface
}) {
  const tone = badgeTone(level, s)
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <Text
        style={[styles.label, { color: tone }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  label: { ...TYPE.cardSub, fontWeight: "500", flexShrink: 1 },
})

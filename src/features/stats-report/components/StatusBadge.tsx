import { StyleSheet, Text, View } from "react-native"

import type { SurfacePalette } from "@/src/theme/surface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

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
  switch (level) {
    case "DANGER":
    case "WORSE":
      return { bg: s.danger, fg: "#FFFFFF", borderColor: null }
    case "CAUTION":
      return { bg: s.surfacePressed, fg: s.textStrong, borderColor: null }
    case "LOW_DATA":
      return { bg: null, fg: s.textWeak, borderColor: s.border }
    case "GOOD":
    case "OK":
    default:
      return { bg: s.surface, fg: s.textMuted, borderColor: null }
  }
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
    <View
      style={[
        styles.badge,
        tone.bg !== null && { backgroundColor: tone.bg },
        tone.borderColor !== null && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tone.borderColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: tone.fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    // 서버가 주는 영어 배지 문구("Needs a quick check")는 한국어의 2~3배다.
    // 고정 높이·무제한 폭이면 옆의 지표 이름을 카드 밖으로 밀어낸다.
    minHeight: LAYOUT.badge.height,
    maxWidth: "55%",
    borderRadius: LAYOUT.badge.radius,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  label: { ...TYPE.cardSub, fontWeight: "700" },
})

/**
 * 검진 상세 상단의 3분할 요약 타일 — 위험 N · 주의 N · 정상 N.
 *
 * 시안의 배경 `#f9fafb` 는 `fill.background`(grayscale.50) 다. 카드가 아니라 **면**이라
 * 보더도 그림자도 없다 — 이 앱의 화면들이 면 대비로 구획을 만든다.
 *
 * 순서를 위험 → 주의 → 정상으로 고정한 이유: 문제 수치가 먼저 읽혀야 한다.
 * 개수가 0 인 칸도 지우지 않는다. 세 칸이 항상 있어야 눈이 위치로 상태를 읽는다.
 */

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  spacing,
  radius,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import type { AnalysisCounts } from "@/src/types/healthAnalysis"
import { STATUS_GLYPH, type StatusGlyphKey } from "./StatusBadge"

const ORDER: StatusGlyphKey[] = ["warning", "caution", "normal"]

export function StatusSummaryTiles({ counts }: { counts: AnalysisCounts }) {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()

  const glyphColor = (key: StatusGlyphKey): string => {
    const { colorKey } = STATUS_GLYPH[key]
    if (colorKey === "brand") return colors.primary.primary
    if (colorKey === "cautionary") return colors.status.cautionary
    return colors.status.negative
  }

  return (
    <View style={styles.row}>
      {ORDER.map((key) => (
        <View
          key={key}
          style={[styles.tile, { backgroundColor: colors.fill.background }]}
        >
          <V2Icon
            name={STATUS_GLYPH[key].icon}
            size={24}
            color={glyphColor(key)}
          />
          <Text style={[styles.label, { color: colors.label.normal }]}>
            {t(`checkup.status.${key}`)} {counts[key]}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing[10],
  },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[16],
    borderRadius: radius.lg,
  },
  label: {
    ...typography.label.small,
  },
})

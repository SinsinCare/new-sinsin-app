import { StyleSheet, Text, View } from "react-native"

import { ItemCard, SectionStack } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { BadgeLevel } from "../types/report"
import { StatusBadge } from "./StatusBadge"
import { useTranslation } from "react-i18next"

type Surface = SurfacePalette & { isDark: boolean }

export interface MetricRow {
  key: string
  label: string
  valueText: string
  unit: string
  deltaText?: string | null
  badgeLevel: BadgeLevel
  badgeLabel: string
  interpret: string
}

/** 지금 봐야 하는 등급 — 이 행들이 목록 맨 위로 온다. */
const ATTENTION: ReadonlySet<BadgeLevel> = new Set([
  "DANGER",
  "CAUTION",
  "WORSE",
  "LOW_DATA",
])

/**
 * 지표 리스트 — 지표 하나 = 카드 하나(`ReportSection` 문법).
 *
 * 숨기는 것은 없다. 확인이 필요한 지표를 위로 올려 순서가 위계를 말하고,
 * 상태는 배지가 말한다.
 */
export function MetricList({
  title,
  rows,
  s,
}: {
  title: string
  rows: MetricRow[]
  s: Surface
}) {
  const { t } = useTranslation("common")
  const attention = rows.filter((row) => ATTENTION.has(row.badgeLevel))
  const calm = rows.filter((row) => !ATTENTION.has(row.badgeLevel))
  const ordered = [...attention, ...calm]

  return (
    <SectionStack
      title={title}
      caption={
        attention.length > 0
          ? t("stats.needsAttention", { count: attention.length })
          : t("stats.allInRange")
      }
    >
      {ordered.map((row) => (
        <ItemCard key={row.key}>
          <View style={styles.rowHead}>
            <Text style={[styles.label, { color: s.text }]}>{row.label}</Text>
            <StatusBadge level={row.badgeLevel} label={row.badgeLabel} s={s} />
          </View>

          <View style={styles.valueRow}>
            <Text
              style={[styles.value, styles.tabular, { color: s.textStrong }]}
            >
              {row.valueText}
            </Text>
            <Text style={[styles.unit, styles.tabular, { color: s.textWeak }]}>
              {row.unit}
            </Text>
            {row.deltaText != null && (
              <Text
                style={[styles.delta, styles.tabular, { color: s.textMuted }]}
              >
                {row.deltaText}
              </Text>
            )}
          </View>

          <Text
            style={[styles.interpret, styles.tabular, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {row.interpret}
          </Text>
        </ItemCard>
      ))}
    </SectionStack>
  )
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ["tabular-nums"] },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  // 컨셉 시트: 지표명 13/600 — 값보다 한 발 물러선다.
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
    flexShrink: 1,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  value: {
    // 컨셉 시트: 값 24/700.
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.4,
    fontWeight: "800",
  },
  unit: { ...TYPE.cardSub },
  delta: { ...TYPE.cardSub, fontWeight: "700" },
  // 컨셉 시트: 해석 13 · 행간 1.6.
  interpret: { fontSize: 13, lineHeight: 21, letterSpacing: -0.26 },
})

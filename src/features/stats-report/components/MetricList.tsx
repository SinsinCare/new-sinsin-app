import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"
import type { BadgeLevel } from "../types/report"
import { orderByAttention } from "../utils/presentation"
import { StatsSection, statsStyles as st } from "./StatsSection"
import { StatusBadge } from "./StatusBadge"

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
export function MetricList({
  title,
  rows,
  s,
}: {
  title: string
  rows: MetricRow[]
  s: SurfacePalette & { isDark: boolean }
}) {
  return (
    <StatsSection title={title}>
      {orderByAttention(rows).map((row, index) => (
        <View
          style={[
            st.row,
            {
              borderBottomColor: s.hairline,
              borderBottomWidth:
                index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
            },
          ]}
          key={row.key}
        >
          <View style={st.rowHead}>
            <Text style={[st.label, { color: s.textStrong }]}>{row.label}</Text>
            <StatusBadge level={row.badgeLevel} label={row.badgeLabel} s={s} />
          </View>
          <View style={styles.values}>
            <Text style={[styles.value, st.numbers, { color: s.textStrong }]}>
              {row.valueText}
            </Text>
            <Text style={[st.meta, { color: s.textMuted }]}>{row.unit}</Text>
            {row.deltaText != null && (
              <Text style={[st.meta, { color: s.textMuted }]}>
                {row.deltaText}
              </Text>
            )}
          </View>
          <Text
            style={[st.detail, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {row.interpret}
          </Text>
        </View>
      ))}
    </StatsSection>
  )
}
const styles = StyleSheet.create({
  values: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 4,
  },
  value: { ...TYPE.question, fontWeight: "700" },
})

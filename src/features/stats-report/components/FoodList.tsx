import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import type { SurfacePalette } from "@/src/theme/surface"
import type { FoodRow } from "../types/report"
import { StatsSection, statsStyles as st } from "./StatsSection"
import { StatusBadge } from "./StatusBadge"

export function FoodList({
  rows,
  s,
}: {
  rows: FoodRow[]
  s: SurfacePalette & { isDark: boolean }
}) {
  const { t } = useTranslation("common")
  return (
    <StatsSection
      title={t("stats.redesign.mealReview")}
      caption={t("stats.redesign.foodCaption")}
    >
      {rows.map((row, index) => (
        <View
          style={[
            st.row,
            {
              borderBottomColor: s.hairline,
              borderBottomWidth:
                index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
            },
          ]}
          key={row.analysisId}
        >
          <View style={st.rowHead}>
            <Text style={[st.meta, st.numbers, { color: s.textMuted }]}>
              {row.timeText}
            </Text>
            <StatusBadge level={row.badgeLevel} label={row.badgeLabel} s={s} />
          </View>
          <Text
            style={[st.label, styles.title, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {row.title}
          </Text>
          <Text style={[st.detail, { color: s.text }]}>{row.metricText}</Text>
        </View>
      ))}
    </StatsSection>
  )
}
const styles = StyleSheet.create({ title: { lineHeight: 22 } })

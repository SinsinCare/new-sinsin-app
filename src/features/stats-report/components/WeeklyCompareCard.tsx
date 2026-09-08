import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import type { SurfacePalette } from "@/src/theme/surface"
import type { WeeklyCompare } from "../types/report"
import { StatsSection, statsStyles as st } from "./StatsSection"

export function WeeklyCompareCard({
  data,
  s,
}: {
  data: WeeklyCompare
  s: SurfacePalette & { isDark: boolean }
}) {
  const { t } = useTranslation("common")
  return (
    <StatsSection title={data.title} caption={data.caption}>
      <View style={[styles.header, { borderBottomColor: s.hairline }]}>
        <Text style={[st.meta, styles.week, { color: s.textMuted }]}>
          {t("stats.redesign.week")}
        </Text>
        <Text style={[st.meta, styles.count, { color: s.textMuted }]}>
          {t("stats.redesign.overDays")}
        </Text>
        <Text style={[st.meta, styles.weight, { color: s.textMuted }]}>
          {t("stats.redesign.weightChange")}
        </Text>
      </View>
      {data.weeks.map((week) => (
        <View
          style={[styles.row, { borderBottomColor: s.hairline }]}
          key={week.label}
        >
          <Text style={[st.label, styles.week, { color: s.textStrong }]}>
            {week.label}
          </Text>
          <View style={styles.count}>
            <Text
              style={[
                st.label,
                { color: week.overDays > 0 ? s.danger : s.textStrong },
              ]}
            >
              {t("stats.redesign.overOfDays", {
                count: week.overDays,
                total: week.daysInWeek,
              })}
            </Text>
          </View>
          <Text style={[st.detail, styles.weight, { color: s.textMuted }]}>
            {week.weightDeltaText ?? t("stats.redesign.noRecord")}
          </Text>
        </View>
      ))}
      {!!data.note && (
        <Text style={[st.detail, { color: s.textMuted, paddingTop: 12 }]}>
          {data.note}
        </Text>
      )}
    </StatsSection>
  )
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  week: { flex: 0.7 },
  count: { flex: 1.3 },
  weight: { flex: 1, textAlign: "right" },
})

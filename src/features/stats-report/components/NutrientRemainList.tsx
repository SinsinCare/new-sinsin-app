import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"
import type { NutrientRemainRow } from "../types/report"
import { orderByAttention } from "../utils/presentation"
import { StatsSection, statsStyles as st } from "./StatsSection"
import { StatusBadge } from "./StatusBadge"

export function NutrientRemainList({
  rows,
  footnote,
  s,
}: {
  rows: NutrientRemainRow[]
  footnote: string | null
  s: SurfacePalette & { isDark: boolean }
}) {
  const { t } = useTranslation("common")
  return (
    <StatsSection
      title={t("stats.redesign.nutrients")}
      caption={t("stats.redesign.nutrientCaption")}
    >
      {orderByAttention(rows).map((row, index) => (
        <View
          key={row.key}
          style={[
            st.row,
            {
              borderBottomColor: s.hairline,
              borderBottomWidth:
                index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={styles.nutrientHead}>
            <View style={styles.nameColumn}>
              <Text style={[st.label, { color: s.textStrong }]}>
                {row.label}
              </Text>
              <StatusBadge
                level={row.badgeLevel}
                label={row.badgeLabel}
                s={s}
              />
            </View>
            <View style={styles.numberColumn}>
              <Text style={[styles.value, st.numbers, { color: s.textStrong }]}>
                {row.valueText}
              </Text>
              <Text style={[st.meta, { color: s.textMuted }]}>
                {t("stats.redesign.against", { limit: row.limitText })}
              </Text>
            </View>
          </View>
          <Text
            style={[st.detail, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {row.remainLine}
          </Text>
          {row.isReference && (
            <Text style={[st.meta, { color: s.textMuted }]}>
              {t("stats.redesign.personalReference")}
            </Text>
          )}
        </View>
      ))}
      {!!footnote && (
        <Text style={[st.meta, styles.footnote, { color: s.textMuted }]}>
          {footnote}
        </Text>
      )}
    </StatsSection>
  )
}
const styles = StyleSheet.create({
  nutrientHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameColumn: { flex: 1, gap: 8 },
  numberColumn: { flex: 1.2, gap: 3, alignItems: "flex-end" },
  value: { ...TYPE.question, fontWeight: "700" },
  footnote: { paddingTop: 10 },
})

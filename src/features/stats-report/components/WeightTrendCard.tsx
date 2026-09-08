import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { REPORT_CARD } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { WeekWeightChart } from "../types/report"
import { WeekBars } from "./WeekBarChart"
import { useTranslation } from "react-i18next"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 주간 체중 추세 카드 — 델타가 주인공이고 바는 배경이다.
 *
 * 배지 라벨이 따로 없는 섹션이라 상태는 델타 숫자의 색으로만 말한다:
 * DANGER/WORSE 델타만 danger, 나머지는 textStrong. 증가가 항상 나쁜 게
 * 아니므로(투석 간 체중 등) 판정은 서버 badgeLevel 을 그대로 믿는다.
 */
export function WeightTrendCard({
  chart,
  s,
}: {
  chart: WeekWeightChart
  s: Surface
}) {
  const { t } = useTranslation("common")
  const deltaColor =
    chart.badgeLevel === "DANGER" || chart.badgeLevel === "WORSE"
      ? s.danger
      : s.textStrong

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: s.textStrong }]}>
          {t("home.tile.weight")}
        </Text>
        {!!chart.baselineText && (
          <Text
            style={[
              styles.sectionCaption,
              styles.tabular,
              { color: s.textWeak },
            ]}
          >
            {chart.baselineText}
          </Text>
        )}
      </View>

      <View style={styles.deltaRow}>
        <Text
          style={[styles.deltaValue, styles.tabular, { color: deltaColor }]}
        >
          {chart.deltaText}
        </Text>
        <Text
          style={[styles.deltaUnit, styles.tabular, { color: s.textMuted }]}
        >
          {chart.deltaUnit}
        </Text>
      </View>

      <WeekBars days={chart.days} s={s} />

      {!!chart.caption && (
        <View style={[styles.captionBox, { backgroundColor: s.surfaceSunken }]}>
          <Text
            style={[styles.captionText, styles.tabular, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {chart.caption}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ["tabular-nums"] },
  card: { ...REPORT_CARD, gap: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    ...TYPE.cardTitle,
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  sectionCaption: { ...TYPE.cardSub, flexShrink: 1, textAlign: "right" },

  deltaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 6,
  },
  deltaValue: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.65,
    fontWeight: "800",
  },
  deltaUnit: { ...TYPE.unit },

  captionBox: { borderRadius: 12, padding: 12 },
  captionText: { ...TYPE.cardSub },
})

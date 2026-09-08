import { StyleSheet, View } from "react-native"
import { router } from "expo-router"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { useReportSurface } from "../hooks/useReportSurface"
import type { StatsReport } from "../types/report"
import { buildStatsConsultContext } from "../utils/consultContext"
import { encodeStatsConsultMessage } from "@/src/features/consultation/utils/statsConsultMessage"
import { ConclusionCard } from "./ConclusionCard"
import { DisclaimerFooter } from "./DisclaimerFooter"
import { FoodList } from "./FoodList"
import { MaintainCard } from "./MaintainCard"
import { MetricList } from "./MetricList"
import { NutrientRemainList } from "./NutrientRemainList"
import { OverlapCard } from "./OverlapCard"
import { WeekBarChart } from "./WeekBarChart"
import { WeeklyCompareCard } from "./WeeklyCompareCard"
import { WeightTrendCard } from "./WeightTrendCard"

/** Complete server report. Presentation never drops interpretations to make the screen shorter. */
export function ReportContent({
  report,
  onRecord,
  onSelectDay,
}: {
  report: StatsReport
  onRecord: () => void
  onSelectDay?: (date: Date) => void
}) {
  const s = useReportSurface()
  const { t } = useTranslation("common")
  return (
    <Animated.View
      entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      style={styles.sections}
    >
      <ConclusionCard
        report={report}
        s={s}
        onRecord={onRecord}
        onAsk={() =>
          router.push({
            pathname: "/consult",
            params: {
              consultRequestId: `stats-${report.period}-${report.startDate}-${Date.now()}`,
              consultCategory: "FOOD_DIET",
              consultContext: buildStatsConsultContext(report),
              consultContextLabel: `${report.title} · ${t("stats.redesign.title")}`,
              consultPrompt: encodeStatsConsultMessage(
                {
                  question: t("stats.redesign.consultQuestion"),
                  label: t("stats.redesign.title"),
                  startDate: report.startDate,
                  endDate: report.endDate,
                },
                buildStatsConsultContext(report),
              ),
            },
          })
        }
      />
      {report.overlapSignals && (
        <OverlapCard data={report.overlapSignals} s={s} />
      )}
      {report.maintainCard && <MaintainCard data={report.maintainCard} s={s} />}
      {!!report.nutrients?.length && (
        <NutrientRemainList
          rows={report.nutrients}
          footnote={report.nutrientsFootnote}
          s={s}
        />
      )}
      {report.weekCharts?.potassium && (
        <WeekBarChart
          title={t("nutrient.potassium")}
          chart={report.weekCharts.potassium}
          s={s}
          startDate={report.startDate}
          onSelectDay={onSelectDay}
        />
      )}
      {report.weeklyCompare && (
        <WeeklyCompareCard data={report.weeklyCompare} s={s} />
      )}
      {!!report.foods?.length && <FoodList rows={report.foods} s={s} />}
      {!!report.averages?.length && (
        <MetricList
          title={t("stats.redesign.periodNumbers")}
          rows={report.averages}
          s={s}
        />
      )}
      {report.weekCharts?.weight && (
        <WeightTrendCard chart={report.weekCharts.weight} s={s} />
      )}
      {!!report.vitals?.length && (
        <MetricList
          title={t("stats.redesign.healthRecords")}
          rows={report.vitals}
          s={s}
        />
      )}
      {!!report.disclaimer && (
        <View style={[styles.footer, { borderTopColor: s.hairline }]}>
          <DisclaimerFooter text={report.disclaimer} s={s} />
        </View>
      )}
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  sections: { gap: 24 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
})

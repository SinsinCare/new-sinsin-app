import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"
import type { WeekChartDay, WeekNutrientChart } from "../types/report"
import {
  addDays,
  barFraction,
  chartScale,
  startOfDay,
} from "../utils/presentation"
import { StatsSection } from "./StatsSection"

type Surface = SurfacePalette & { isDark: boolean }
const HEIGHT = 104

export function WeekBars({
  days,
  s,
  reference = false,
  onSelectIndex,
  isDayDisabled,
}: {
  days: WeekChartDay[]
  s: Surface
  reference?: boolean
  onSelectIndex?: (index: number) => void
  isDayDisabled?: (index: number) => boolean
}) {
  const { t } = useTranslation("common")
  const scale = chartScale(days)
  return (
    <View style={styles.plot}>
      {reference && (
        <View
          pointerEvents="none"
          style={[
            styles.reference,
            { bottom: 26 + HEIGHT / scale, borderColor: s.border },
          ]}
        />
      )}
      <View style={styles.bars}>
        {days.map((day, index) => {
          const fraction = barFraction(day, scale)
          const missing = fraction === null
          const label = t("stats.redesign.chartDay", {
            day: day.day,
            status: t(
              missing
                ? "stats.redesign.noRecord"
                : day.over
                  ? "stats.redesign.over"
                  : "stats.redesign.recorded",
            ),
          })
          return (
            <Pressable
              key={index}
              accessibilityRole={onSelectIndex ? "button" : "image"}
              accessibilityLabel={label}
              disabled={!onSelectIndex || isDayDisabled?.(index)}
              accessibilityState={
                onSelectIndex
                  ? { disabled: isDayDisabled?.(index) ?? false }
                  : undefined
              }
              onPress={() => onSelectIndex?.(index)}
              style={({ pressed }) => [
                styles.day,
                { backgroundColor: pressed ? s.surfaceSunken : undefined },
              ]}
            >
              <View style={styles.area}>
                {missing ? (
                  <View style={[styles.missing, { borderColor: s.border }]} />
                ) : (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(2, fraction * HEIGHT),
                        backgroundColor: day.over ? s.danger : s.textMuted,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.dayLabel, { color: s.textMuted }]}>
                {day.day}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
export function WeekBarChart({
  title,
  chart,
  s,
  startDate,
  onSelectDay,
}: {
  title: string
  chart: WeekNutrientChart
  s: Surface
  startDate?: string
  onSelectDay?: (date: Date) => void
}) {
  const { t } = useTranslation("common")
  const recorded = chart.days.filter((day) => !day.empty)
  const onSelect =
    startDate && onSelectDay
      ? (index: number) => {
          const [y, m, d] = startDate.split("-").map(Number)
          const date = addDays(new Date(y, m - 1, d), index)
          if (date <= startOfDay(new Date())) onSelectDay(date)
        }
      : undefined
  return (
    <StatsSection
      title={t("stats.redesign.trend", { nutrient: title })}
      caption={chart.limitText}
    >
      <View style={styles.summary}>
        <Text style={[styles.count, { color: s.textStrong }]}>
          {t("stats.redesign.overCount", {
            count: recorded.filter((day) => day.over).length,
          })}
        </Text>
        <Text style={[styles.meta, { color: s.textMuted }]}>
          {t("stats.redesign.recordedDays", { count: recorded.length })}
        </Text>
      </View>
      <WeekBars
        days={chart.days}
        s={s}
        reference
        onSelectIndex={onSelect}
        isDayDisabled={(index) => {
          if (!startDate) return false
          const [y, m, d] = startDate.split("-").map(Number)
          return addDays(new Date(y, m - 1, d), index) > startOfDay(new Date())
        }}
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: s.danger }]} />
          <Text style={[styles.meta, { color: s.textMuted }]}>
            {t("stats.redesign.over")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.dot, { borderColor: s.border, borderWidth: 1 }]}
          />
          <Text style={[styles.meta, { color: s.textMuted }]}>
            {t("stats.redesign.noRecord")}
          </Text>
        </View>
        {onSelect && (
          <Text style={[styles.meta, { color: s.textMuted }]}>
            {t("stats.redesign.tapDay")}
          </Text>
        )}
      </View>
      {!!chart.caption && (
        <Text
          style={[
            styles.insight,
            {
              color: s.text,
              backgroundColor: s.surfaceSunken,
              borderColor: s.hairline,
            },
          ]}
          lineBreakStrategyIOS="hangul-word"
        >
          {chart.caption}
        </Text>
      )}
    </StatsSection>
  )
}
const styles = StyleSheet.create({
  plot: { position: "relative", paddingTop: 16, marginTop: 4 },
  bars: { flexDirection: "row", gap: 2 },
  day: { flex: 1, alignItems: "center", borderRadius: 8 },
  area: { height: HEIGHT, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: 22, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  missing: { width: 22, height: 3, borderWidth: 1, borderRadius: 2 },
  dayLabel: {
    ...TYPE.cardSub,
    paddingTop: 8,
    height: 26,
    fontVariant: ["tabular-nums"],
  },
  reference: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 12,
  },
  count: { ...TYPE.question, fontWeight: "700" },
  meta: { ...TYPE.cardSub },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 2 },
  insight: {
    ...TYPE.caption,
    lineHeight: 22,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
    marginBottom: -4,
  },
})

import { StyleSheet, Text, View } from "react-native"

import { REPORT_CARD } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { WeekChartDay, WeekNutrientChart } from "../types/report"

type Surface = SurfacePalette & { isDark: boolean }

/** 바 영역 높이. 축이 없으므로 이 안에서 비율이 곧 높이다. */
const BAR_AREA_HEIGHT = 72
/** 기록이 있는 날의 최소 바 높이 — 0 에 가까워도 "기록했음"은 보여야 한다. */
const BAR_MIN_HEIGHT = 6

/**
 * 주간 7칸 바 — 축·격자·범례 없이 높이와 색만 말한다.
 *
 * 그레이스케일 원칙: 보통 날은 중간 회색, **제한을 넘긴 날만 danger**.
 * 기록 없는 날은 바 대신 빈 칸(surface 면 + 테두리)으로 남겨서
 * "0이었다"와 "안 적었다"를 섞지 않는다.
 */
export function WeekBars({ days, s }: { days: WeekChartDay[]; s: Surface }) {
  return (
    <View style={styles.barsRow}>
      {days.map((d) => {
        const ratio = Math.min(1, Math.max(0, d.ratio))
        const barHeight = Math.max(ratio * BAR_AREA_HEIGHT, BAR_MIN_HEIGHT)
        return (
          <View key={d.day} style={styles.dayCol}>
            <View style={styles.barArea}>
              {d.empty ? (
                <View
                  style={[
                    styles.emptySlot,
                    { backgroundColor: s.surface, borderColor: s.border },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: d.over ? s.danger : s.placeholder,
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[styles.dayLabel, styles.tabular, { color: s.textWeak }]}
            >
              {d.day}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/**
 * 주간 영양소 차트 카드(칼륨). 타이틀 + 기준 캡션 → 바 → 해석.
 * 해석은 차트 밑 회색 면에 — 차트가 말을 못 하는 부분("지난주 1일 → 이번 주 3일")을
 * 서버 문장이 채운다.
 */
export function WeekBarChart({
  title,
  chart,
  s,
}: {
  title: string
  chart: WeekNutrientChart
  s: Surface
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: s.textStrong }]}>
          {title}
        </Text>
        <Text
          style={[styles.sectionCaption, styles.tabular, { color: s.textWeak }]}
        >
          {chart.limitText}
        </Text>
      </View>

      <WeekBars days={chart.days} s={s} />

      {!!chart.caption && (
        <View style={[styles.captionBox, { backgroundColor: s.surface }]}>
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
  sectionCaption: { ...TYPE.cardSub },

  barsRow: { flexDirection: "row", gap: 6 },
  dayCol: { flex: 1, alignItems: "center", gap: 5 },
  barArea: {
    height: BAR_AREA_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
    alignSelf: "stretch",
  },
  bar: { width: 18, borderRadius: 5 },
  emptySlot: {
    width: 18,
    height: BAR_AREA_HEIGHT,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayLabel: { fontSize: 11, lineHeight: 15, letterSpacing: -0.22 },

  captionBox: { borderRadius: 12, padding: 12 },
  captionText: { ...TYPE.cardSub },
})

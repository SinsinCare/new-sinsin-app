import { StyleSheet, Text, View } from "react-native"

import { REPORT_CARD } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { WeeklyCompare } from "../types/report"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 월간 주별 비교 — 한 주가 한 행, 초과일만 붉은 칸.
 *
 * 칸 수 = daysInWeek(월 경계 주는 7 미만), 붉은 칸 수 = overDays.
 * 어느 요일이 초과였는지는 여기서 말하지 않는다 — 그건 주간 화면의 일이고,
 * 월간은 "몇 번 넘겼는지"의 추세만 본다(평균으로 판정하지 않는 계약과 같은 결).
 */
export function WeeklyCompareCard({
  data,
  s,
}: {
  data: WeeklyCompare
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
        <Text
          style={[styles.sectionTitle, { color: s.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {data.title}
        </Text>
        <Text
          style={[styles.sectionCaption, { color: s.textWeak }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {data.caption}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {data.weeks.map((week) => (
          <View key={week.label} style={styles.weekRow}>
            <Text
              style={[styles.weekLabel, styles.tabular, { color: s.textMuted }]}
            >
              {week.label}
            </Text>
            <View style={styles.cellsRow}>
              {Array.from({ length: week.daysInWeek }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: i < week.overDays ? s.danger : s.surface,
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[
                styles.weightDelta,
                styles.tabular,
                { color: s.textMuted },
              ]}
            >
              {week.weightDeltaText ?? ""}
            </Text>
          </View>
        ))}
      </View>

      {!!data.note && (
        <View style={[styles.noteBox, { backgroundColor: s.surface }]}>
          <Text
            style={[styles.noteText, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {data.note}
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

  weekRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  weekLabel: { ...TYPE.caption, fontWeight: "600", minWidth: 32 },
  cellsRow: { flexDirection: "row", gap: 3, flex: 1 },
  cell: { flex: 1, height: 10, maxWidth: 22, borderRadius: 3 },
  weightDelta: { ...TYPE.cardSub, minWidth: 52, textAlign: "right" },

  noteBox: { borderRadius: 12, padding: 12 },
  noteText: { ...TYPE.cardSub },
})

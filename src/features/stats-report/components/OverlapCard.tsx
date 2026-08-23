import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { REPORT_CARD } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { OverlapSignals } from "../types/report"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 겹친 신호 카드(일간) — 따로 보면 안 보이는 조합을 한 카드에 묶는다.
 *
 * 신호 자체가 위험 조합이지만 면은 흰 카드 그대로다. 상태색은 신호 앞의
 * 도트에만 얹는다 — 카드를 레드로 칠하는 순간 결론 카드의 위계가 무너진다.
 * 의료기관 연락 CTA 는 아직 없다. note 는 사용자가 직접 취할 행동만 안내하며,
 * 앱이 의료진에게 대신 연락하는 것으로 읽히면 안 된다.
 */
export function OverlapCard({ data, s }: { data: OverlapSignals; s: Surface }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <Text style={[styles.title, { color: s.textMuted }]}>{data.title}</Text>

      <Text
        style={[styles.headline, { color: s.textStrong }]}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {data.headline}
      </Text>

      <View style={{ gap: 8 }}>
        {data.signals.map((signal) => (
          <View key={signal.label} style={styles.signalRow}>
            <View style={[styles.signalDot, { backgroundColor: s.danger }]} />
            <Text
              style={[
                styles.signalLabel,
                styles.tabular,
                { color: s.textStrong },
              ]}
            >
              {signal.label}
            </Text>
            <Text
              style={[
                styles.signalDetail,
                styles.tabular,
                { color: s.textMuted },
              ]}
              numberOfLines={1}
            >
              {signal.detail}
            </Text>
          </View>
        ))}
      </View>

      {!!data.note && (
        <View style={[styles.noteBox, { backgroundColor: s.surface }]}>
          <Text
            style={[styles.noteText, { color: s.text }]}
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
  card: { ...REPORT_CARD, gap: 10 },
  title: { ...TYPE.cardSub, fontWeight: "700" },
  headline: {
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: -0.34,
    fontWeight: "800",
  },
  signalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  signalDot: { width: 5, height: 5, borderRadius: 999 },
  signalLabel: { ...TYPE.caption, fontWeight: "700" },
  signalDetail: { ...TYPE.cardSub, flex: 1 },
  noteBox: { borderRadius: 12, padding: 14 },
  noteText: { ...TYPE.caption },
})

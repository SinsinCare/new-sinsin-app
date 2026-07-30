import { StyleSheet, Text, View } from "react-native"

import { REPORT_CARD } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { MaintainCard as MaintainCardData } from "../types/report"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 복용 변경 주의 카드 — 혈압이 연속으로 참고 목표 안일 때 노출한다.
 *
 * 좋은 소식도 초록 면으로 칠하지 않는다. footer(처방 금지 고지)는
 * 서버 문구를 그대로 — "괜찮으니 약을 줄여도 된다"로 읽히는 걸 막는 문장이라
 * 화면이 임의로 자르면 안 된다.
 */
export function MaintainCard({
  data,
  s,
}: {
  data: MaintainCardData
  s: Surface
}) {
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

      {!!data.body && (
        <Text
          style={[styles.body, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {data.body}
        </Text>
      )}

      {!!data.footer && (
        <View style={[styles.footer, { borderTopColor: s.hairline }]}>
          <Text
            style={[styles.footerText, { color: s.textWeak }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {data.footer}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { ...REPORT_CARD, gap: 8 },
  title: { ...TYPE.cardSub, fontWeight: "700" },
  headline: {
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: -0.34,
    fontWeight: "800",
  },
  body: { ...TYPE.caption },
  footer: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerText: { ...TYPE.cardSub },
})

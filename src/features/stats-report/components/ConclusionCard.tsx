import { StyleSheet, Text, View } from "react-native"

import { REPORT_CARD } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import { EmphasizedText } from "@/src/shared/components/EmphasizedText"

import type { BadgeLevel, StatsReport } from "../types/report"
import { StatusBadge } from "./StatusBadge"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 결론이 danger 톤인지 — 서버에 conclusionTone 필드가 없으므로 파생한다.
 * badge 문자열("나빠짐" 포함 여부 같은)로 판단하지 않는다 — 문구는 에이전트가
 * 다듬는 영역이라 흔들린다. 판정 필드(badgeLevel)만 본다.
 */
export function deriveConclusionTone(report: StatsReport): "DANGER" | "BRAND" {
  const hasDanger =
    // 겹친 신호는 존재 자체가 위험 조합이다(2개 미만이면 서버가 null 을 준다).
    report.overlapSignals !== null ||
    (report.nutrients ?? []).some((n) => n.badgeLevel === "DANGER") ||
    // 일간: 혈압 160/100 같은 위험은 nutrients 가 아니라 vitals 에 실려 온다.
    (report.vitals ?? []).some((v) => v.badgeLevel === "DANGER") ||
    // 주간·월간: 체중·혈압 위험은 averages 행의 배지에 미러링된다.
    (report.averages ?? []).some((a) => a.badgeLevel === "DANGER")
  return hasDanger ? "DANGER" : "BRAND"
}

/**
 * 결론 카드 — 이 기간을 한 줄로. 배지(확인 건수) → 헤드라인 → 근거 → 할 일.
 *
 * 강조색은 하나다: DANGER 결론이면 danger, 아니면 brand. 나쁜 소식의 숫자를
 * CTA 색으로 칠하면 광고처럼 읽히기 때문에 톤을 먼저 정하고 색을 입힌다.
 */
export function ConclusionCard({
  report,
  s,
}: {
  report: StatsReport
  s: Surface
}) {
  const { conclusion, reliability } = report
  const tone = deriveConclusionTone(report)
  const accent = tone === "DANGER" ? s.danger : s.brand

  // 배지 판정: 기록 부족이 위험 표시보다 우선한다 — 데이터가 모자라면
  // 위험도 단정하지 않는 게 계약(결론 강도 하향)이다.
  const badgeLevel: BadgeLevel =
    reliability.level === "LOW"
      ? "LOW_DATA"
      : tone === "DANGER"
        ? "DANGER"
        : "OK"

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <StatusBadge level={badgeLevel} label={conclusion.badge} s={s} />

      <EmphasizedText
        style={[styles.headline, { color: s.textStrong }]}
        emphasisColor={accent}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {conclusion.headline}
      </EmphasizedText>

      {!!conclusion.support && (
        <Text
          style={[styles.support, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {conclusion.support}
        </Text>
      )}

      {!!conclusion.action && (
        <View style={[styles.actionBox, { backgroundColor: s.surface }]}>
          <EmphasizedText
            style={[styles.actionText, { color: s.textStrong }]}
            emphasisColor={s.textStrong}
            lineBreakStrategyIOS="hangul-word"
          >
            {conclusion.action}
          </EmphasizedText>
          {!!conclusion.actionCaption && (
            <Text
              style={[styles.actionCaption, { color: s.textMuted }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {conclusion.actionCaption}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { ...REPORT_CARD, gap: 12 },
  headline: {
    fontSize: 21,
    lineHeight: 30,
    letterSpacing: -0.42,
    fontWeight: "800",
  },
  support: { ...TYPE.caption },
  actionBox: { borderRadius: 12, padding: 14, gap: 3 },
  actionText: { ...TYPE.cardTitle, fontWeight: "600" },
  actionCaption: { ...TYPE.cardSub },
})

import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { Image } from "expo-image"

import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { hasReportEvidence } from "../utils/presentation"
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
  onRecord,
  onAsk,
}: {
  report: StatsReport
  s: Surface
  onRecord: () => void
  onAsk?: () => void
}) {
  const { t } = useTranslation("common")
  const { conclusion, reliability } = report
  const hasEvidence = hasReportEvidence(report)
  const isAi = hasEvidence && conclusion.source === "AI"
  const tone = deriveConclusionTone(report)
  const badgeLevel: BadgeLevel =
    reliability.level === "LOW"
      ? "LOW_DATA"
      : tone === "DANGER"
        ? "DANGER"
        : "OK"
  return (
    <View style={styles.summaryGroup}>
      {hasEvidence && (
        <View style={styles.authorRow}>
          {isAi && (
            <Image
              source={require("@/assets/images/home-record-character.png")}
              style={styles.avatar}
              contentFit="contain"
              accessible={false}
            />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.author, { color: s.textStrong }]}>
              {t(
                isAi
                  ? "stats.redesign.aiAuthor"
                  : "stats.redesign.recordSummary",
              )}
            </Text>
            <Text style={[styles.note, { color: s.textMuted }]}>
              {t(
                isAi
                  ? "stats.redesign.aiContext"
                  : "stats.redesign.summaryContext",
              )}
            </Text>
          </View>
        </View>
      )}
      <View
        style={[
          styles.hero,
          { backgroundColor: s.card, borderColor: s.hairline },
        ]}
      >
        <View style={styles.eyebrow}>
          <Text style={[styles.kicker, { color: s.textMuted }]}>
            {t(`stats.redesign.insight.${report.period}`)}
          </Text>
          {hasEvidence && (
            <StatusBadge level={badgeLevel} label={conclusion.badge} s={s} />
          )}
        </View>
        <EmphasizedText
          style={[styles.headline, { color: s.textStrong }]}
          emphasisColor={tone === "DANGER" ? s.danger : s.textStrong}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {hasEvidence ? conclusion.headline : t("stats.redesign.emptyTitle")}
        </EmphasizedText>
        {hasEvidence && (
          <Text style={[styles.actionLabel, { color: s.textMuted }]}>
            {t("stats.redesign.evidenceLabel")}
          </Text>
        )}
        <Text
          style={[styles.support, { color: s.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {hasEvidence ? conclusion.support : t("stats.redesign.emptyBody")}
        </Text>
        <View style={[styles.coverage, { borderColor: s.hairline }]}>
          <Ionicons
            accessible={false}
            importantForAccessibility="no"
            name="reader-outline"
            size={15}
            color={s.textMuted}
          />
          <Text style={[styles.coverageText, { color: s.textMuted }]}>
            {t("stats.redesign.coverage", {
              recorded: reliability.mealsRecorded,
              expected: reliability.mealsExpected,
            })}
          </Text>
          <Text style={[styles.rate, { color: s.textMuted }]}>
            {reliability.ratePercent}%
          </Text>
        </View>
      </View>
      {hasEvidence && !!conclusion.action && (
        <View
          style={[
            styles.actionBox,
            { backgroundColor: s.card, borderColor: s.hairline },
          ]}
        >
          <View style={styles.actionHeader}>
            <Ionicons
              accessible={false}
              importantForAccessibility="no"
              name="arrow-forward-circle-outline"
              size={18}
              color={s.brand}
            />
            <Text style={[styles.actionLabel, { color: s.textStrong }]}>
              {t("stats.redesign.nextAction")}
            </Text>
          </View>
          <EmphasizedText
            style={[styles.actionText, { color: s.textStrong }]}
            emphasisColor={s.textStrong}
            lineBreakStrategyIOS="hangul-word"
          >
            {conclusion.action}
          </EmphasizedText>
          {!!conclusion.actionCaption && (
            <Text style={[styles.note, { color: s.textMuted }]}>
              {conclusion.actionCaption}
            </Text>
          )}
        </View>
      )}
      {hasEvidence && onAsk && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("stats.redesign.askAi")}
          onPress={onAsk}
          style={({ pressed }) => [
            styles.askButton,
            {
              borderColor: s.hairline,
              backgroundColor: s.card,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            accessible={false}
            name="chatbubble-ellipses-outline"
            size={18}
            color={s.brand}
          />
          <Text style={[styles.ctaLabel, { color: s.textStrong, flex: 1 }]}>
            {t("stats.redesign.askAi")}
          </Text>
          <Ionicons
            accessible={false}
            name="chevron-forward"
            size={16}
            color={s.textMuted}
          />
        </Pressable>
      )}
      {reliability.mealsRecorded === 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("stats.redesign.record")}
          onPress={onRecord}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: s.brand, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.ctaLabel, { color: s.onBrand }]}>
            {t("stats.redesign.record")}
          </Text>
          <Ionicons
            accessible={false}
            importantForAccessibility="no"
            name="arrow-forward"
            size={18}
            color={s.onBrand}
          />
        </Pressable>
      )}
      {!hasEvidence && (
        <View
          style={[
            styles.expectations,
            { backgroundColor: s.card, borderColor: s.hairline },
          ]}
        >
          <Text style={[styles.actionLabel, { color: s.textStrong }]}>
            {t("stats.redesign.afterRecord")}
          </Text>
          {(["intake", "patterns", "action"] as const).map((key) => (
            <View style={styles.expectation} key={key}>
              <Ionicons
                accessible={false}
                importantForAccessibility="no"
                name="checkmark"
                size={16}
                color={s.textMuted}
              />
              <Text style={[styles.note, { color: s.textMuted, flex: 1 }]}>
                {t(`stats.redesign.expect.${key}`)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
const styles = StyleSheet.create({
  summaryGroup: { gap: 12 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 2,
  },
  avatar: { width: 36, height: 40 },
  author: { ...TYPE.value, fontWeight: "700" },
  askButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  hero: { gap: 12, padding: 18, borderRadius: 20, borderWidth: 1 },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  kicker: { ...TYPE.caption, fontWeight: "600", flexShrink: 1 },
  headline: { ...TYPE.question, fontWeight: "700", lineHeight: 29 },
  support: { ...TYPE.value, lineHeight: 23 },
  coverage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  coverageText: { ...TYPE.cardSub, flex: 1 },
  rate: { ...TYPE.cardSub, fontVariant: ["tabular-nums"] },
  note: { ...TYPE.caption, lineHeight: 21 },
  actionBox: { borderRadius: 18, padding: 16, gap: 8, borderWidth: 1 },
  actionHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  actionLabel: { ...TYPE.caption, fontWeight: "600" },
  actionText: { ...TYPE.value, lineHeight: 23, fontWeight: "600" },
  cta: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  ctaLabel: { ...TYPE.cardTitle, fontWeight: "600", flexShrink: 1 },
  expectations: { gap: 14, padding: 18, borderRadius: 18, borderWidth: 1 },
  expectation: { flexDirection: "row", alignItems: "center", gap: 9 },
})

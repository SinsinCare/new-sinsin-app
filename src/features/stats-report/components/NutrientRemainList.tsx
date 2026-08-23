import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { ItemCard, SectionStack } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { NutrientRemainRow } from "../types/report"
import { StatusBadge } from "./StatusBadge"
import { useTranslation } from "react-i18next"

type Surface = SurfacePalette & { isDark: boolean }

/** 확인이 필요한 등급 — 카드 순서를 정한다. */
const ATTENTION = new Set(["DANGER", "CAUTION", "WORSE", "LOW_DATA"])

/**
 * 일간 남은 양 — 영양소 하나 = 카드 하나(`ReportSection` 문법).
 *
 * 한도 모르는 행은 서버가 이미 뺐다(지어내지 않는다). 초과 값만 danger 글자 —
 * 면은 배지가 전부 말한다. 각주는 카드 밖 조용한 한 블록으로 내린다.
 */
export function NutrientRemainList({
  rows,
  footnote,
  s,
}: {
  rows: NutrientRemainRow[]
  footnote: string | null
  s: Surface
}) {
  const { t } = useTranslation("common")
  const attention = rows.filter((row) => ATTENTION.has(row.badgeLevel))
  const calm = rows.filter((row) => !ATTENTION.has(row.badgeLevel))
  const ordered = [...attention, ...calm]

  return (
    <SectionStack
      title={t("stats.remaining")}
      caption={
        attention.length > 0
          ? t("stats.needsAttention", { count: attention.length })
          : null
      }
    >
      {ordered.map((row) => (
        <ItemCard key={row.key}>
          <View style={styles.rowHead}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: s.text }]}>{row.label}</Text>
              {row.isReference && (
                <Text style={[styles.referenceTag, { color: s.placeholder }]}>
                  {t("stats.reference")}
                </Text>
              )}
            </View>
            <StatusBadge level={row.badgeLevel} label={row.badgeLabel} s={s} />
          </View>

          <Text style={[styles.valueLine, styles.tabular]}>
            <Text
              style={{
                color: row.badgeLevel === "DANGER" ? s.danger : s.textStrong,
                fontWeight: "800",
              }}
            >
              {row.valueText}
            </Text>
            <Text style={{ color: s.textWeak }}> / {row.limitText}</Text>
          </Text>

          <Text
            style={[styles.remainLine, styles.tabular, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {row.remainLine}
          </Text>
        </ItemCard>
      ))}

      {!!footnote && (
        <Text
          style={[styles.footnoteText, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {footnote}
        </Text>
      )}
    </SectionStack>
  )
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ["tabular-nums"] },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    flexShrink: 1,
  },
  // 컨셉 시트: 지표명 13/600 — 값보다 한 발 물러선다.
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
  },
  referenceTag: { fontSize: 11, lineHeight: 15, letterSpacing: -0.22 },
  valueLine: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  remainLine: { ...TYPE.caption, lineHeight: 21 },
  footnoteText: { ...TYPE.cardSub, paddingHorizontal: 4, paddingTop: 2 },
})

import { StyleSheet, Text, View } from "react-native"

import { ItemCard, SectionStack } from "@/src/shared/components/ReportSection"
import type { SurfacePalette } from "@/src/theme/surface"
import { TYPE } from "@/src/theme/surface"

import type { FoodRow } from "../types/report"
import { StatusBadge } from "./StatusBadge"
import { useTranslation } from "react-i18next"

type Surface = SurfacePalette & { isDark: boolean }

/**
 * 일간 '오늘 먹은 것' — 끼니 하나 = 카드 하나(`ReportSection` 문법).
 *
 * 시간순을 유지한다. 여기서는 순서가 곧 하루의 흐름이라, 확인 필요 항목을
 * 위로 올리는 지표 카드들과 규칙이 다르다 — 배지가 눈에 띄는 역할을 맡는다.
 * analysisId 로 식사 리포트에 딥링크할 수 있지만 1차는 표시만 한다.
 */
export function FoodList({ rows, s }: { rows: FoodRow[]; s: Surface }) {
  const { t } = useTranslation("common")
  return (
    <SectionStack title={t("stats.foodsToday")}>
      {rows.map((row) => (
        <ItemCard key={row.analysisId}>
          <View style={styles.rowHead}>
            <Text
              style={[styles.title, { color: s.textStrong }]}
              numberOfLines={1}
            >
              {row.title}
            </Text>
            <StatusBadge level={row.badgeLevel} label={row.badgeLabel} s={s} />
          </View>
          <Text style={[styles.meta, styles.tabular, { color: s.textWeak }]}>
            {row.timeText} · {row.metricText}
          </Text>
        </ItemCard>
      ))}
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
  },
  title: { ...TYPE.cardTitle, fontWeight: "700", flex: 1 },
  meta: { ...TYPE.cardSub, lineHeight: 19 },
})

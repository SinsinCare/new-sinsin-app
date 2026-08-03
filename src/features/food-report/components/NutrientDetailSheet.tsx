import { StyleSheet, Text, View } from "react-native"

import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"

import type { MealReport } from "../types/report"
import { useTranslation } from "react-i18next"

/**
 * ⑧ 상세 영양성분표 — 2차 화면.
 *
 * 리포트 본문은 "그래서 뭘 하면 되는지"만 말하고, 8개 영양소 전체 수치는
 * 보고 싶은 사람만 여기서 본다. 예전 화면이 이걸 첫 화면에 깔아서
 * "수치 화면"이 됐다.
 *
 * 비교 기준이 없는 행(체중 미기록 → 단백질)의 % 칸은 "—" 로 둔다.
 * 빈칸을 0% 로 채우면 목표가 있는 것처럼 읽힌다.
 *
 * **시트가 아니라 인라인 펼침이다.** 이 리포트 화면 자체가 이미 바텀시트라
 * 그 위에 시트를 또 띄우면 열리지 않는다(실제로 겪었다). 접힘/펼침으로 두면
 * "본문은 인사이트, 수치는 접어서" 라는 의도도 그대로 지켜진다.
 */

const ROWS = [
  { key: "calories", unit: "kcal" },
  { key: "carbohydrates", unit: "g" },
  { key: "protein", unit: "g" },
  { key: "fat", unit: "g" },
  { key: "sodium", unit: "mg" },
  { key: "potassium", unit: "mg" },
  { key: "phosphorus", unit: "mg" },
  { key: "water", unit: "ml" },
] as const

export function NutrientDetailSheet({
  open,
  report,
}: {
  open: boolean
  report: MealReport
}) {
  const { t, i18n } = useTranslation("common")
  const s = useSurface()
  const { facts } = report

  if (!open) return null

  // 한도는 budgets 에만 있다. 없는 영양소는 % 를 만들지 않는다.
  const limits = new Map(facts.budgets.map((b) => [b.nutrient, b.limit]))
  // 표기는 서버가 준다 — 여기서 반올림하면 예산 카드의 "30g" 과 어긋난다.
  const limitTexts = new Map(
    facts.budgets.map((b) => [b.nutrient, b.limitText]),
  )

  return (
    <View style={[styles.panel, { borderTopColor: s.hairline }]}>
      <Text style={[styles.title, { color: s.textStrong }]}>
        {t("mealReport.nutritionFacts")}
      </Text>
      <Text style={[styles.sub, { color: s.textMuted }]}>
        {facts.mealName} · {t("mealReport.profileReference")}
      </Text>

      <View style={[styles.head, { borderBottomColor: s.hairline }]}>
        <Text style={[styles.headCell, { color: s.textWeak, flex: 1 }]}>
          {t("mealReport.nutrient")}
        </Text>
        <Text
          style={[
            styles.headCell,
            { color: s.textWeak, width: 92, textAlign: "right" },
          ]}
        >
          {t("mealReport.amount")}
        </Text>
        <Text
          style={[
            styles.headCell,
            { color: s.textWeak, width: 76, textAlign: "right" },
          ]}
        >
          {t("mealReport.percentOfLimit")}
        </Text>
      </View>

      {ROWS.map((row) => {
        const amount = facts.mealTotal[row.key] ?? 0
        const limit = limits.get(row.key) ?? null
        // 열량 목표는 budgets 에 없다(제한이 아니라 참고치). 서버가 계산해 준
        // energyPercent 를 그대로 쓴다 — 여기서 다시 계산하지 않는다.
        const percent =
          row.key === "calories"
            ? facts.energyPercent
            : limit && limit > 0
              ? Math.round((amount / limit) * 100)
              : null

        return (
          <View
            key={row.key}
            style={[styles.row, { borderBottomColor: s.hairline }]}
          >
            {/* "기준 대비 116%" 만 있으면 기준이 얼마인지 알 수 없다. 한도를 아는
                영양소는 이름 밑에 그 숫자를 적는다(실사용 피드백). */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.cell, { color: s.text }]}>
                {t(`mealReport.nutrients.${row.key}`)}
              </Text>
              {/* truthy 검사 — 이 필드가 없던 시절 리포트면 undefined 다. */}
              {limitTexts.get(row.key) && (
                <Text style={[styles.limit, { color: s.textWeak }]}>
                  {t("mealReport.limitIs", { amount: limitTexts.get(row.key) })}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.cell,
                styles.tabular,
                { color: s.textStrong, width: 92, textAlign: "right" },
              ]}
            >
              {formatAmount(
                amount,
                row.unit,
                i18n.resolvedLanguage ?? i18n.language,
              )}
            </Text>
            <Text
              style={[
                styles.cell,
                styles.tabular,
                {
                  color: s.textMuted,
                  fontWeight: "400",
                  width: 76,
                  textAlign: "right",
                },
              ]}
            >
              {percent === null ? "—" : `${percent}%`}
            </Text>
          </View>
        )
      })}

      <Text
        style={[styles.notice, { color: s.textWeak }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("mealReport.nutritionNotice")}
      </Text>
    </View>
  )
}

function formatAmount(value: number, unit: string, language: string) {
  if (unit === "g") {
    const rounded = Math.round(value * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}${unit}`
  }
  const locale = language.startsWith("en") ? "en-US" : "ko-KR"
  return `${Math.round(value).toLocaleString(locale)}${unit}`
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: { ...TYPE.sheetTitle, fontWeight: "700" },
  sub: { ...TYPE.cardSub, marginTop: 2, marginBottom: 16 },
  head: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headCell: { ...TYPE.cardSub, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { ...TYPE.value },
  limit: { ...TYPE.cardSub, fontVariant: ["tabular-nums"], marginTop: 1 },
  tabular: { fontVariant: ["tabular-nums"] },
  notice: { ...TYPE.cardSub, marginTop: 18 },
})

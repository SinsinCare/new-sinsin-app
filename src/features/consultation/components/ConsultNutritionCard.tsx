import { ConsultChevron, ConsultDisclosure } from "./ConsultDisclosure"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Icon, V2Text, spacing, useV2Theme } from "@/src/design-system-v2"
import type { ConsultNutritionCard as NutritionSnapshot } from "@/src/types/consultNutritionCard"
import { nutrientComparison } from "../lib/consultNutrition"

export function ConsultNutritionCard({
  card,
  onDisclosure,
}: {
  card: NutritionSnapshot
  onDisclosure?: () => void
}) {
  const { t, i18n } = useTranslation("common")
  const { colors } = useV2Theme()
  const [basisOpen, setBasisOpen] = useState(false)
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en-US"
    : "ko-KR"
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(card.asOf))
  const intake = card.kind === "intake"
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.default,
          borderColor: colors.line.normal,
        },
      ]}
    >
      <View style={styles.heading}>
        <V2Text token="label.small" color={colors.label.normal}>
          {t(`consult.nutritionCard.${card.kind}`)}
        </V2Text>
        <V2Text token="subtext.small" color={colors.label.neutral}>
          {t("consult.nutritionCard.asOf", {
            date: card.date.replaceAll("-", "."),
            time,
          })}
        </V2Text>
      </View>
      {!card.recorded && (
        <V2Text
          token="subtext.medium"
          color={colors.label.neutral}
          style={styles.empty}
          lineBreakStrategyIOS="hangul-word"
        >
          {t(`consult.nutritionCard.${intake ? "noIntake" : "noTargets"}`)}
        </V2Text>
      )}
      <View style={[styles.columnHead, { borderColor: colors.line.normal }]}>
        <V2Text token="subtext.small" color={colors.label.neutral}>
          {t("consult.nutritionCard.nutrient")}
        </V2Text>
        <V2Text token="subtext.small" color={colors.label.neutral}>
          {t(`consult.nutritionCard.${intake ? "columns" : "targetColumn"}`)}
        </V2Text>
      </View>
      <View style={styles.rows}>
        {card.rows.map((row) => {
          const comparison = nutrientComparison(row)
          const consumed = row.consumed === null ? "—" : format(row.consumed)
          const target = row.target === null ? "—" : format(row.target)
          return (
            <View
              key={row.nutrient}
              style={[styles.row, { borderColor: colors.line.normal }]}
            >
              <View style={styles.values}>
                <V2Text
                  token="subtext.medium"
                  color={colors.label.normal}
                  style={styles.name}
                >
                  {t(`consult.nutritionCard.names.${row.nutrient}`)}
                </V2Text>
                <View style={styles.amounts}>
                  {intake && (
                    <V2Text token="label.small" color={colors.label.normal}>
                      {consumed}
                    </V2Text>
                  )}
                  <V2Text
                    token={intake ? "subtext.medium" : "label.small"}
                    color={intake ? colors.label.neutral : colors.label.normal}
                  >
                    {intake ? " / " : ""}
                    {target} {row.unit}
                  </V2Text>
                </View>
              </View>
              {intake && comparison.ratio !== null && (
                <View
                  accessible={false}
                  style={[
                    styles.track,
                    { backgroundColor: colors.fill.normal },
                  ]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${comparison.ratio * 100}%`,
                        backgroundColor: colors.label.neutral,
                      },
                    ]}
                  />
                </View>
              )}
              {intake && card.recorded && (
                <V2Text
                  token="subtext.small"
                  color={colors.label.neutral}
                  style={styles.difference}
                >
                  {comparison.difference === null
                    ? t(
                        `consult.nutritionCard.${row.consumed === null ? "unrecorded" : "unset"}`,
                      )
                    : t(`consult.nutritionCard.${comparison.direction}`, {
                        amount: format(Math.abs(comparison.difference)),
                        unit: row.unit,
                      })}
                </V2Text>
              )}
            </View>
          )
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: basisOpen }}
        onPress={() => {
          onDisclosure?.()
          setBasisOpen((open) => !open)
        }}
        style={({ pressed }) => [
          styles.basisButton,
          { borderColor: colors.line.normal, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <V2Icon name="info" size={14} color={colors.label.neutral} />
        <V2Text
          token="subtext.medium"
          color={colors.label.neutral}
          style={styles.grow}
        >
          {t("consult.nutritionCard.basis")}
        </V2Text>
        <ConsultChevron open={basisOpen} />
      </Pressable>
      <ConsultDisclosure open={basisOpen}>
        <View style={styles.basis}>
          <V2Text
            token="subtext.medium"
            color={colors.label.neutral}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("consult.nutritionCard.source")}
          </V2Text>
          {card.proteinBasisKg !== null && (
            <V2Text
              token="subtext.medium"
              color={colors.label.neutral}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("consult.nutritionCard.proteinBasis", {
                weight: format(card.proteinBasisKg),
              })}
            </V2Text>
          )}
          {intake && (
            <V2Text
              token="subtext.medium"
              color={colors.label.neutral}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("consult.nutritionCard.intakeBasis")}
            </V2Text>
          )}
        </View>
      </ConsultDisclosure>
    </View>
  )
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  heading: { padding: spacing[16], gap: spacing[6] },
  empty: { paddingHorizontal: spacing[16], paddingBottom: spacing[12] },
  columnHead: {
    marginHorizontal: spacing[16],
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing[8],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[12],
  },
  rows: { paddingHorizontal: spacing[16] },
  row: {
    paddingVertical: spacing[12],
    gap: spacing[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  values: { flexDirection: "row", alignItems: "baseline", gap: spacing[8] },
  name: { flexShrink: 0 },
  amounts: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: 3, borderRadius: 2 },
  difference: { textAlign: "right" },
  basisButton: {
    minHeight: 44,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  basis: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    gap: spacing[8],
  },
  grow: { flex: 1 },
})

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import type { NutrientBudget } from "../types"

interface NutrientBarProps {
  label: string
  remaining: number | null
  unit: string
  color: string
}

function NutrientBar({ label, remaining, unit, color }: NutrientBarProps) {
  const { t, i18n } = useTranslation()
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const subColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey5.val

  /*
    막대는 "남았다/넘었다" 만 보여 준다 — 남은 양에 비례하지 않는다.
    (원본 계산 그대로: 0 또는 100%. 중간값이 없다.)
  */
  const fillPercent =
    remaining == null ? 0 : Math.min(100, Math.max(10, remaining > 0 ? 100 : 0))

  return (
    <V2VStack flex={1} align="center" gap={2}>
      <V2Text color={subColor} style={styles.caption}>
        {label}
      </V2Text>
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            { width: `${fillPercent}%`, backgroundColor: color },
          ]}
        />
      </View>
      <V2Text color={color} style={styles.value}>
        {remaining == null
          ? t("mealRecommendation.weightNeeded")
          : remaining > 0
            ? t("mealRecommendation.underLimit", {
                amount: new Intl.NumberFormat(
                  i18n.language.startsWith("en") ? "en-US" : "ko-KR",
                ).format(Math.round(remaining)),
                unit,
              })
            : t("mealRecommendation.overLimit")}
      </V2Text>
    </V2VStack>
  )
}

interface NutrientBudgetBarProps {
  budget: NutrientBudget
}

export function NutrientBudgetBar({ budget }: NutrientBudgetBarProps) {
  const { t } = useTranslation()
  return (
    <V2HStack gap={8}>
      <NutrientBar
        label={t("nutrient.sodium")}
        remaining={budget.sodiumMg}
        unit="mg"
        color="#EE6145"
      />
      <NutrientBar
        label={t("nutrient.potassium")}
        remaining={budget.potassiumMg}
        unit="mg"
        color="#0D896A"
      />
      <NutrientBar
        label={t("nutrient.phosphorus")}
        remaining={budget.phosphorusMg}
        unit="mg"
        color="#7C3AED"
      />
      <NutrientBar
        label={t("nutrient.protein")}
        remaining={budget.proteinG}
        unit="g"
        color="#0369A1"
      />
    </V2HStack>
  )
}

const styles = StyleSheet.create({
  /* `fontFamily="$body"` 는 옮기지 않는다 — V2Text 가 weight 로 face 를 고른다. */
  caption: { fontSize: 11 },
  value: { fontSize: 11, fontWeight: "600" },
  track: { height: 4, width: "100%", borderRadius: 2 },
  fill: { height: 4, borderRadius: 2 },
})

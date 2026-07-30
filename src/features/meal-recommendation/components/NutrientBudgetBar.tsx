import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, YStack, Text, View } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { NutrientBudget } from "../types"
import { useTranslation } from "react-i18next"

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

  return (
    <YStack flex={1} alignItems="center" gap={2}>
      <Text fontSize={11} fontFamily="$body" color={subColor}>
        {label}
      </Text>
      <View
        height={4}
        width="100%"
        borderRadius={2}
        backgroundColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}
      >
        <View
          height={4}
          width={`${
            remaining == null
              ? 0
              : Math.min(100, Math.max(10, remaining > 0 ? 100 : 0))
          }%`}
          borderRadius={2}
          backgroundColor={color}
        />
      </View>
      <Text fontSize={11} fontFamily="$body" fontWeight="600" color={color}>
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
      </Text>
    </YStack>
  )
}

interface NutrientBudgetBarProps {
  budget: NutrientBudget
}

export function NutrientBudgetBar({ budget }: NutrientBudgetBarProps) {
  const { t } = useTranslation()
  return (
    <XStack gap={8}>
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
    </XStack>
  )
}

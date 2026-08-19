import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { DietaryGuideContainer } from "./DietaryGuideContainer"

interface DietaryGuideProps {
  dietaryGuide?: string
  cautionFoods?: string[]
}

export function DietaryGuide({
  dietaryGuide,
  cautionFoods,
}: DietaryGuideProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  /*
    원래 `isDarkMode ? "$textDark" : "$black"` 이었다. v2 `label.strong` 이 스킴에
    맞는 값을 이미 들고 있어 분기가 사라진다 — `useAppColorScheme()` 도 불필요해졌다.
  */
  return (
    <V2VStack paddingVertical={12} gap={12}>
      <V2Text
        color={colors.label.strong}
        style={{ fontSize: 20, fontWeight: "600" }}
      >
        {t("stats.dietaryGuide.title")}
      </V2Text>

      <DietaryGuideContainer title={t("stats.dietaryGuide.today")} isSummary>
        <V2Text
          color={colors.label.strong}
          style={{ fontSize: 14, lineHeight: 18 }}
          lineBreakStrategyIOS="hangul-word"
        >
          {dietaryGuide ?? t("stats.dietaryGuide.empty")}
        </V2Text>
      </DietaryGuideContainer>

      {cautionFoods && cautionFoods.length > 0 && (
        <>
          <V2Text
            color={colors.label.neutral}
            style={styles.nextMeal}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("stats.dietaryGuide.nextMeal")}
          </V2Text>
          <DietaryGuideContainer title={t("stats.dietaryGuide.foods")}>
            <V2HStack wrap="wrap" gap={8}>
              {cautionFoods.map((food) => (
                /* `$primary2`(브랜드 옅은 면) → v2 primary.primaryWeak */
                <V2Text
                  key={food}
                  color={colors.primary.primary}
                  style={[
                    styles.foodChip,
                    { backgroundColor: colors.primary.primaryWeak },
                  ]}
                >
                  {food}
                </V2Text>
              ))}
            </V2HStack>
          </DietaryGuideContainer>
        </>
      )}
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  nextMeal: { fontSize: 15, fontWeight: "500", paddingTop: 12 },
  foodChip: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
})

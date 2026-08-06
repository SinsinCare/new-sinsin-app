import { Text, XStack, YStack } from "tamagui"
import { DietaryGuideContainer } from "./DietaryGuideContainer"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useTranslation } from "react-i18next"

interface DietaryGuideProps {
  dietaryGuide?: string
  cautionFoods?: string[]
}

export function DietaryGuide({
  dietaryGuide,
  cautionFoods,
}: DietaryGuideProps) {
  const { t } = useTranslation()
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        {t("stats.dietaryGuide.title")}
      </Text>

      <DietaryGuideContainer title={t("stats.dietaryGuide.today")} isSummary>
        <Text
          fontSize={14}
          color={isDarkMode ? "$textDark" : "$black"}
          lineHeight={18}
          lineBreakStrategyIOS="hangul-word"
        >
          {dietaryGuide ?? t("stats.dietaryGuide.empty")}
        </Text>
      </DietaryGuideContainer>

      {cautionFoods && cautionFoods.length > 0 && (
        <>
          <Text
            fontSize={15}
            fontWeight="500"
            color="$colorSubtle"
            paddingTop="$3"
            lineBreakStrategyIOS="hangul-word"
          >
            {t("stats.dietaryGuide.nextMeal")}
          </Text>
          <DietaryGuideContainer title={t("stats.dietaryGuide.foods")}>
            <XStack flexWrap="wrap" gap="$2">
              {cautionFoods.map((food) => (
                <Text
                  key={food}
                  fontSize={13}
                  fontWeight="600"
                  backgroundColor="$primary2"
                  color="$primary"
                  paddingHorizontal="$2"
                  paddingVertical="$1.5"
                  borderRadius="$4"
                >
                  {food}
                </Text>
              ))}
            </XStack>
          </DietaryGuideContainer>
        </>
      )}
    </YStack>
  )
}

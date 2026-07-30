import { DietaryRecordCard } from "./DietaryRecordCard"
import { MealRecord } from "../../data/dietaryRecord"
import { MealType } from "../../types"
import { DateAnalysisDiet } from "@/src/types"
import { Text, XStack, YStack } from "tamagui"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useTranslation } from "react-i18next"

const ALL_MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]

interface DietaryRecordProps {
  diets: DateAnalysisDiet[]
  onSelectMealType: (mealType: MealType) => void
}

export function DietaryRecord({ diets, onSelectMealType }: DietaryRecordProps) {
  const { t, i18n } = useTranslation()
  const mealRecords: MealRecord[] = ALL_MEAL_TYPES.map((mealType) => {
    const diet = diets.find((d) => d.mealType === mealType)
    const time = diet
      ? (() => {
          const d = new Date(diet.createdAt + "Z")
          return new Intl.DateTimeFormat(
            i18n.language.startsWith("en") ? "en-US" : "ko-KR",
            { hour: "numeric", minute: "2-digit" },
          ).format(d)
        })()
      : null
    return {
      id: `meal-${mealType}`,
      mealType,
      label: t(`meal.${mealType}`),
      time,
      imageUri: diet?.imageUrl ?? null,
    }
  })
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack paddingVertical="$4" gap="$3">
      <YStack gap="$1">
        <Text
          fontSize={20}
          fontWeight="600"
          color={isDarkMode ? "$textDark" : "$black"}
        >
          {t("stats.dietary.title")}
        </Text>
        <Text fontSize={14} fontWeight="500" color="$colorSubtle">
          {t("stats.dietary.body")}
        </Text>
      </YStack>
      <XStack width="100%" justifyContent="center" gap="$2">
        {mealRecords.map((m) => (
          <DietaryRecordCard
            key={m.id}
            mealData={m}
            onPress={() => onSelectMealType(m.mealType)}
          />
        ))}
      </XStack>
    </YStack>
  )
}

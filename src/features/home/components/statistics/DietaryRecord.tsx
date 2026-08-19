import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { DietaryRecordCard } from "./DietaryRecordCard"
import { MealRecord } from "../../data/dietaryRecord"
import { MealType } from "../../types"
import { DateAnalysisDiet } from "@/src/types"

const ALL_MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]

interface DietaryRecordProps {
  diets: DateAnalysisDiet[]
  onSelectMealType: (mealType: MealType) => void
}

export function DietaryRecord({ diets, onSelectMealType }: DietaryRecordProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useV2Theme()
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

  return (
    <V2VStack paddingVertical={16} gap={12}>
      <V2VStack gap={4}>
        <V2Text
          color={colors.label.strong}
          style={{ fontSize: 20, fontWeight: "600" }}
        >
          {t("stats.dietary.title")}
        </V2Text>
        <V2Text
          color={colors.label.neutral}
          style={{ fontSize: 14, fontWeight: "500" }}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("stats.dietary.body")}
        </V2Text>
      </V2VStack>
      <V2HStack justify="center" gap={8} style={{ width: "100%" }}>
        {mealRecords.map((m) => (
          <DietaryRecordCard
            key={m.id}
            mealData={m}
            onPress={() => onSelectMealType(m.mealType)}
          />
        ))}
      </V2HStack>
    </V2VStack>
  )
}

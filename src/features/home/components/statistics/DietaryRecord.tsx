import { DietaryRecordCard } from "./DietaryRecordCard"
import { MealRecord } from "../../data/dietaryRecord"
import { MealType } from "../../types"
import { DateAnalysisDiet } from "@/src/types"
import { Text, XStack, YStack } from "tamagui"

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

const ALL_MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]

interface DietaryRecordProps {
  diets: DateAnalysisDiet[]
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

export function DietaryRecord({
  diets,
  selectedMealType,
  onSelectMealType,
}: DietaryRecordProps) {
  const mealRecords: MealRecord[] = ALL_MEAL_TYPES.map((mealType) => {
    const diet = diets.find((d) => d.mealType === mealType)
    const time = diet
      ? (() => {
          const d = new Date(diet.createdAt + "Z")
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        })()
      : null
    return {
      id: `meal-${mealType}`,
      mealType,
      label: MEAL_LABELS[mealType],
      time,
      imageUri: diet?.imageUrl ?? null,
    }
  })

  return (
    <YStack paddingVertical="$4" gap="$3">
      <YStack gap="$1">
        <Text fontSize={20} fontWeight="600">
          식이 기록
        </Text>
        <Text fontSize={14} fontWeight="500" color="$colorSubtle">
          카드를 누르면 상세 분석 내용을 볼 수 있어요.
        </Text>
      </YStack>
      <XStack width="100%" justifyContent="center" gap="$2">
        {mealRecords.map((m) => (
          <DietaryRecordCard
            key={m.id}
            mealData={m}
            onPress={() => onSelectMealType(m.mealType)}
            isSelected={selectedMealType === m.mealType}
          />
        ))}
      </XStack>
    </YStack>
  )
}

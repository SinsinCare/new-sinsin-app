import { DietaryRecordCard } from "./DietaryRecordCard"
import { mockDailyMealRecords } from "../../data/dietaryRecord"
import { MealType } from "../../types"
import { Text, XStack, YStack } from "tamagui"

interface DietaryRecordProps {
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}
export function DietaryRecord({
  selectedMealType,
  onSelectMealType,
}: DietaryRecordProps) {
  return (
    <YStack paddingVertical="$3" gap="$3">
      <YStack gap="$1.5">
        <Text fontSize="$6" fontWeight="700">
          식이 기록
        </Text>
        <Text fontSize="$3.5" fontWeight="500" color="$color.grey5">
          카드를 누르면 상세 분석 내용을 볼 수 있어요.
        </Text>
      </YStack>
      <XStack width="100%" justifyContent="center" gap="$3">
        {mockDailyMealRecords.map((m) => (
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

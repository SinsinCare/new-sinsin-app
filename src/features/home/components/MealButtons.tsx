import { Text, XStack, YStack } from "tamagui"
import { MealType } from "../types"
import { MealButton } from "./MealButton"

interface MealButtonsProps {
  onSelectMealType: (mealType: MealType) => void
  selectedMealType?: MealType | null
}

export function MealButtons({
  onSelectMealType,
  selectedMealType,
}: MealButtonsProps) {
  const mealTypes: MealType[] = ["아침", "점심", "저녁", "간식"]

  return (
    <YStack paddingHorizontal="$4" paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="600">
        식이 기록하기
      </Text>
      <XStack width="100%" gap="$3">
        {mealTypes.map((type) => (
          <MealButton
            key={type}
            mealType={type}
            onPress={() => onSelectMealType(type)}
            isSelected={selectedMealType === type}
          />
        ))}
      </XStack>
    </YStack>
  )
}

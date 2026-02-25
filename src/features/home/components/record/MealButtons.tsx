import { Text, XStack, YStack } from "tamagui"
import { TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { MealType } from "../../types"
import { MealButton } from "./MealButton"
import { tokens } from "@/src/theme/tokens"

interface MealButtonsProps {
  onSelectMealType: (mealType: MealType) => void
  selectedMealType?: MealType | null
  mealImages?: Partial<Record<MealType, string>>
  recordedMeals?: Partial<Record<MealType, boolean>>
  onRecord: () => void
}

export function MealButtons({
  onSelectMealType,
  selectedMealType,
  mealImages = {},
  recordedMeals = {},
  onRecord,
}: MealButtonsProps) {
  const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]

  return (
    <YStack paddingVertical="$3" gap="$4">
      <Text fontSize={22} fontWeight="700">
        식이 기록
      </Text>
      <XStack width="100%" justifyContent="center" gap="$2">
        {mealTypes.map((type) => (
          <MealButton
            key={type}
            mealType={type}
            onPress={() => onSelectMealType(type)}
            isSelected={selectedMealType === type}
            imageUri={mealImages[type]}
            isRecorded={recordedMeals[type] ?? false}
          />
        ))}
      </XStack>

      <TouchableOpacity
        style={[
          styles.recordButton,
          !selectedMealType && styles.recordButtonDisabled,
        ]}
        onPress={onRecord}
        disabled={!selectedMealType}
      >
        <Ionicons
          name="camera-outline"
          size={20}
          color={tokens.color.pureWhite.val}
        />
        <Text color="white" fontSize="$4" fontWeight="600">
          식이 기록하기
        </Text>
      </TouchableOpacity>
    </YStack>
  )
}

const styles = StyleSheet.create({
  recordButton: {
    backgroundColor: tokens.color.primary7.val,
    borderRadius: 25,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  recordButtonDisabled: {
    backgroundColor: tokens.color.grey6.val,
  },
})

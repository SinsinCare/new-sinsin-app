import { TouchableOpacity } from "react-native"
import { MealType } from "../types"
import { Text, XStack } from "tamagui"

interface MealButtonProps {
  mealType: MealType
  onPress: () => void
  isSelected?: boolean
}
export function MealButton({ mealType, onPress, isSelected }: MealButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack
        backgroundColor={isSelected ? "$primary" : "$background"}
        borderWidth={1}
        borderColor={isSelected ? "$primary" : "$borderColor"}
        paddingVertical="$8"
        paddingHorizontal="$4"
        borderRadius="$6"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text
          fontSize="$5"
          fontWeight="500"
          color={isSelected ? "white" : "$color"}
        >
          {mealType}
        </Text>
      </XStack>
    </TouchableOpacity>
  )
}

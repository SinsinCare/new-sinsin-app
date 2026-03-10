import { Image, TouchableOpacity } from "react-native"
import { Text, YStack } from "tamagui"
import { MealRecord } from "../../data/dietaryRecord"

interface DietaryRecordCardProps {
  mealData: MealRecord
  onPress: () => void
  isSelected?: boolean
}

export function DietaryRecordCard({
  mealData,
  onPress,
  isSelected,
}: DietaryRecordCardProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <YStack
        backgroundColor="$white"
        borderWidth={2}
        borderColor="$borderColor"
        width={78}
        height={100}
        borderRadius="$6"
        overflow="hidden"
        justifyContent="flex-end"
      >
        {mealData.imageUri && (
          <Image
            source={{ uri: mealData.imageUri }}
            style={{ position: "absolute", width: 78, height: 100 }}
            resizeMode="cover"
          />
        )}
        <YStack padding="$2">
          <Text
            fontSize="$4"
            fontWeight="500"
            color={mealData.imageUri || isSelected ? "white" : "$color"}
          >
            {mealData.label}
          </Text>
          <Text
            fontSize="$3"
            fontWeight="500"
            color={mealData.imageUri || isSelected ? "white" : "$colorSubtle"}
          >
            {mealData.time ?? "기록 없음"}
          </Text>
        </YStack>
      </YStack>
    </TouchableOpacity>
  )
}

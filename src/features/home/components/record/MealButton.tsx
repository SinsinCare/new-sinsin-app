import { TouchableOpacity, Image, StyleSheet } from "react-native"
import { MealType } from "../../types"
import { Text, YStack, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

interface MealButtonProps {
  mealType: MealType
  onPress: () => void
  imageUri?: string | null
  isRecorded?: boolean
}

export function MealButton({
  mealType,
  onPress,
  imageUri,
  isRecorded,
}: MealButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <YStack
        backgroundColor={tokens.color.offWhite.val}
        borderWidth={2}
        borderColor="$borderColor"
        width={78}
        height={100}
        borderRadius="$6"
        overflow="hidden"
        justifyContent="flex-end"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : !isRecorded ? (
          <View position="absolute" top={6} right={6}>
            <Ionicons name="add" size={22} color={tokens.color.grey6.val} />
          </View>
        ) : (
          <View position="absolute" top={6} right={6}>
            <Ionicons name="checkmark-circle" size={18} />
          </View>
        )}

        <YStack padding="$2" gap={3}>
          <Text
            fontSize="$4"
            fontWeight="500"
            color={isRecorded ? "$white" : "$color"}
          >
            {MEAL_LABEL[mealType]}
          </Text>
          {!imageUri && !isRecorded && (
            <Text fontSize="$3" fontWeight="400">
              기록 전
            </Text>
          )}
        </YStack>
      </YStack>
    </TouchableOpacity>
  )
}

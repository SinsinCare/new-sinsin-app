import { TouchableOpacity, Image, StyleSheet } from "react-native"
import { MealType } from "../../types"
import { Text, YStack, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"

interface MealButtonProps {
  mealType: MealType
  onPress: () => void
  isSelected?: boolean
  imageUri?: string | null
  isRecorded?: boolean
}

export function MealButton({
  mealType,
  onPress,
  isSelected,
  imageUri,
  isRecorded,
}: MealButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <YStack
        backgroundColor={isSelected ? "$primary" : "$white"}
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
            <Ionicons
              name="add"
              size={22}
              color={
                isSelected ? tokens.color.pureWhite.val : tokens.color.grey5.val
              }
            />
          </View>
        ) : (
          <View position="absolute" top={6} right={6}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={
                isSelected ? tokens.color.pureWhite.val : tokens.color.sub6.val
              }
            />
          </View>
        )}

        <YStack padding="$2">
          <Text
            fontSize="$4"
            fontWeight="500"
            color={imageUri || isSelected ? "white" : "$color"}
          >
            {mealType}
          </Text>
          {!imageUri && !isRecorded && (
            <Text
              fontSize="$3"
              fontWeight="400"
              color={isSelected ? "white" : "$colorSubtle"}
            >
              기록 전
            </Text>
          )}
        </YStack>
      </YStack>
    </TouchableOpacity>
  )
}

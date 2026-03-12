import {
  Image,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { Text, YStack } from "tamagui"
import { MealRecord } from "../../data/dietaryRecord"

interface DietaryRecordCardProps {
  mealData: MealRecord
  onPress: () => void
}

export function DietaryRecordCard({
  mealData,
  onPress,
}: DietaryRecordCardProps) {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
      <YStack
        backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
        borderWidth={isDarkMode ? 0 : 1}
        borderColor="$borderColor"
        flex={1}
        height={100}
        borderRadius="$6"
        overflow="hidden"
        justifyContent="flex-end"
      >
        {mealData.imageUri && (
          <Image
            source={{ uri: mealData.imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}
        <YStack padding="$2">
          <Text
            fontSize="$4"
            fontWeight="500"
            color={
              mealData.imageUri ? "white" : isDarkMode ? "$textDark" : "$color"
            }
          >
            {mealData.label}
          </Text>
          <Text
            fontSize="$3"
            fontWeight="500"
            color={mealData.imageUri ? "white" : "$colorSubtle"}
          >
            {mealData.time ?? "기록 없음"}
          </Text>
        </YStack>
      </YStack>
    </TouchableOpacity>
  )
}

import {
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { MealType } from "../../types"
import { Text, YStack, View } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { Icon } from "@/src/shared/components"

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

const MEAL_ICON: Record<
  MealType,
  "morning-food" | "noon-food" | "evening-food" | "dessert-food"
> = {
  BREAKFAST: "morning-food",
  LUNCH: "noon-food",
  DINNER: "evening-food",
  SNACKS: "dessert-food",
}

interface MealButtonProps {
  mealType: MealType
  onPress: () => void
  imageUri?: string | null
  isRecorded?: boolean
  time?: string
}

export function MealButton({
  mealType,
  onPress,
  imageUri,
  isRecorded,
  time,
}: MealButtonProps) {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
      <YStack
        backgroundColor={
          isRecorded ? "$primary2" : isDarkMode ? "$cardBgDark" : "$pureWhite"
        }
        borderWidth={1}
        borderColor={
          !imageUri && isRecorded
            ? "$primary7"
            : isDarkMode
              ? "#36363E"
              : "$deleteBg"
        }
        flex={1}
        height={100}
        borderRadius="$6"
        overflow="hidden"
        justifyContent="flex-end"
      >
        {imageUri && (
          <>
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <View position="absolute" top={6} right={6}>
              <Icon name="check-orange" size={18} />
            </View>
          </>
        )}
        {!imageUri &&
          (!isRecorded ? (
            <View position="absolute" top={6} right={6}>
              <Icon name="plus" size={22} color={tokens.color.grey6.val} />
            </View>
          ) : (
            <View position="absolute" top={6} right={6}>
              <Icon name="check-orange" size={18} />
            </View>
          ))}

        {!imageUri && (
          <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            padding="$2"
            gap="$2"
          >
            <Icon name={MEAL_ICON[mealType]} size={28} />
            <Text
              fontSize={14}
              fontWeight="600"
              color={
                isRecorded ? "$primary7" : isDarkMode ? "$textDark" : "$color"
              }
            >
              {MEAL_LABEL[mealType]}
            </Text>
            {isRecorded && time && (
              <Text fontSize={12} fontWeight="400" color="$primary7">
                {time}
              </Text>
            )}
          </YStack>
        )}
        {imageUri && time && (
          <View position="absolute" bottom={8} left={8}>
            <Text fontSize={14} fontWeight="600" color="$white">
              {MEAL_LABEL[mealType]}
            </Text>
            <Text fontSize={12} fontWeight="400" color="$white">
              {time}
            </Text>
          </View>
        )}
      </YStack>
    </TouchableOpacity>
  )
}

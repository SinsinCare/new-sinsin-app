import { Text, XStack, YStack } from "tamagui"
import { fmt } from "../../utils/graphUtils"
import { useColorScheme } from "react-native"

interface NutrientGraphHeaderProps {
  nutrient: string
  current: number
  max: number
  unit: string
  isOver: boolean
}

export function NutrientGraphHeader({
  nutrient,
  current,
  max,
  unit,
  isOver,
}: NutrientGraphHeaderProps) {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <YStack gap={3}>
      <Text
        fontSize={17}
        fontWeight="600"
        color={isOver ? "$primary" : isDarkMode ? "$textDark" : "$color"}
      >
        {nutrient}
      </Text>
      <XStack alignItems="baseline">
        <Text
          fontSize={19}
          fontWeight="600"
          color={isOver ? "$primary" : isDarkMode ? "$textDark" : "$color"}
        >
          {fmt(current)}
          {unit}
        </Text>
        <Text fontSize={15} color="$colorSubtle">
          /{fmt(max)}
          {unit} 제한
        </Text>
      </XStack>
      {nutrient === "단백질" && (
        <Text fontSize={11} color="$colorSubtle" marginTop={1}>
          체중 1kg당 0.8g 기준
        </Text>
      )}
    </YStack>
  )
}

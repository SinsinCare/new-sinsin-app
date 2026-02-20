import { Text, XStack, YStack } from "tamagui"
import { fmt } from "../../utils/graphUtils"

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
  return (
    <YStack gap={3}>
      <Text
        fontSize={17}
        fontWeight="600"
        color={isOver ? "$primary" : "$color"}
      >
        {nutrient}
      </Text>
      <XStack alignItems="baseline">
        <Text
          fontSize={19}
          fontWeight="600"
          color={isOver ? "$primary" : "$color"}
        >
          {fmt(current)}
          {unit}
        </Text>
        <Text fontSize={15} color="$colorSubtle">
          /{fmt(max)}
          {unit} 제한
        </Text>
      </XStack>
    </YStack>
  )
}

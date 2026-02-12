import { XStack, YStack, View, Text } from "tamagui"

interface NutrientGraphProps {
  nutrient: string
  current: number
  max: number
  unit: string
}

export function NutrientGraph({
  nutrient,
  current,
  max,
  unit,
}: NutrientGraphProps) {
  const percentage = Math.min((current / max) * 100, 100)
  const isOver = current > max

  return (
    <XStack
      alignItems="center"
      gap="$3"
      backgroundColor="$background"
      borderRadius="$5"
      padding="$2"
    >
      <View
        backgroundColor="$backgroundPress"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$5"
        minWidth={56}
        alignItems="center"
      >
        <Text fontSize={12} fontWeight="bold">
          {nutrient}
        </Text>
      </View>
      <YStack flex={1} gap="$1" paddingTop="$1">
        <View
          height={6}
          backgroundColor="$backgroundFocus"
          borderRadius="$true"
          width="100%"
          overflow="hidden"
        >
          <View
            height="100%"
            backgroundColor={isOver ? "$backgroundTransparent" : "$primary"}
            borderRadius="$true"
            width={`${percentage}%`}
          />
        </View>

        <XStack justifyContent="space-between">
          <Text fontSize={9} color="$primary" fontWeight="500">
            나의 하루 섭취량: {current}
            {unit}
          </Text>
          <Text fontSize={9}>
            제한량 최대: {max}
            {unit}
          </Text>
        </XStack>
      </YStack>
    </XStack>
  )
}

import { XStack, YStack, Text } from "tamagui"
import { Pressable } from "react-native"
import { KidneyRecommendedFood } from "../types"
import { ScoreGauge } from "./ScoreGauge"
import { FlowTags } from "./FlowTags"

interface LowPhosphorusCardProps {
  item: KidneyRecommendedFood
  onPress: (item: KidneyRecommendedFood) => void
}

export function LowPhosphorusCard({ item, onPress }: LowPhosphorusCardProps) {
  return (
    <Pressable onPress={() => onPress(item)}>
      <XStack
        backgroundColor="$cardBackground"
        borderRadius="$4"
        padding="$3"
        gap="$3"
        alignItems="center"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <ScoreGauge score={item.score} size={56} strokeWidth={4} />
        <YStack flex={1} gap="$1">
          <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
            {item.food.name}
          </Text>
          <FlowTags tags={item.tags} />
          <XStack gap="$3">
            <Text fontSize="$3" color="$colorSubtle">
              P: {item.food.phosphorus ?? "-"}mg
            </Text>
            <Text fontSize="$3" color="$colorSubtle">
              K: {item.food.potassium ?? "-"}mg
            </Text>
            <Text fontSize="$3" color="$colorSubtle">
              Na: {item.food.sodium ?? "-"}mg
            </Text>
          </XStack>
        </YStack>
      </XStack>
    </Pressable>
  )
}

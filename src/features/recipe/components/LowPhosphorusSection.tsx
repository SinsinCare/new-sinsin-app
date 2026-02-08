import { YStack, XStack, Text } from "tamagui"
import { Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"
import { KidneyRecommendedFood } from "../types"
import { LowPhosphorusCard } from "./LowPhosphorusCard"

interface LowPhosphorusSectionProps {
  recommendations: KidneyRecommendedFood[]
  onFoodPress: (item: KidneyRecommendedFood) => void
  onClose: () => void
}

export function LowPhosphorusSection({
  recommendations,
  onFoodPress,
  onClose,
}: LowPhosphorusSectionProps) {
  return (
    <YStack gap="$3" paddingHorizontal="$4" paddingTop="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color">
          안심 식재료 Top 40
        </Text>
        <Pressable onPress={onClose}>
          <Ionicons
            name="close-circle-outline"
            size={24}
            color={tokens.color.grey5.val}
          />
        </Pressable>
      </XStack>

      <YStack gap="$2">
        {recommendations.map((item, index) => (
          <LowPhosphorusCard
            key={item.food.name}
            item={item}
            onPress={onFoodPress}
          />
        ))}
      </YStack>
    </YStack>
  )
}

import { ScrollView } from "react-native"
import { XStack, YStack, Text } from "tamagui"
import { KidneyRecommendedFood } from "../types"
import { KidneyFoodCard } from "./KidneyFoodCard"

interface KidneyNutritionSectionProps {
  recommendations: KidneyRecommendedFood[]
  onFoodPress: (item: KidneyRecommendedFood) => void
  onViewAll: () => void
}

export function KidneyNutritionSection({
  recommendations,
  onFoodPress,
  onViewAll,
}: KidneyNutritionSectionProps) {
  const displayItems = recommendations.slice(0, 10)

  return (
    <YStack gap="$3" paddingTop="$3">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$4"
      >
        <Text fontSize="$6" fontWeight="700" color="$color">
          안심 식재료
        </Text>
        <Text
          fontSize="$4"
          color="$secondary"
          fontWeight="600"
          onPress={onViewAll}
        >
          전체보기
        </Text>
      </XStack>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {displayItems.map((item) => (
          <KidneyFoodCard
            key={item.food.name}
            item={item}
            onPress={onFoodPress}
          />
        ))}
      </ScrollView>
    </YStack>
  )
}

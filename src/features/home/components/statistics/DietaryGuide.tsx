import { Text, XStack, YStack, View } from "tamagui"
import { DietaryGuideContainer } from "./DietaryGuideContainer"
import {
  MOCK_SUMMARY,
  MOCK_CAUTION_FOODS,
  NUTRIENT_TAG_COLORS,
  NutrientCategory,
} from "../../data/dietaryGuideConstants"

export function DietaryGuide() {
  const categories = Object.keys(NUTRIENT_TAG_COLORS) as NutrientCategory[]

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        식이 가이드
      </Text>

      <DietaryGuideContainer title="한줄평">
        <Text fontSize={14} color="$gray11" lineHeight={18}>
          {MOCK_SUMMARY}
        </Text>
      </DietaryGuideContainer>

      <DietaryGuideContainer title="내가 주의할 음식">
        <XStack flexWrap="wrap" gap="$2">
          {MOCK_CAUTION_FOODS.map((food) => (
            <Text
              key={food.name}
              fontSize="$3"
              fontWeight="600"
              backgroundColor={NUTRIENT_TAG_COLORS[food.category]}
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$4"
            >
              {food.name}
            </Text>
          ))}
        </XStack>
        <XStack gap="$2" justifyContent="flex-end">
          {categories.map((category) => (
            <XStack key={category} alignItems="center" gap="$1">
              <YStack
                width={8}
                height={8}
                borderRadius="$true"
                backgroundColor={NUTRIENT_TAG_COLORS[category]}
              />
              <Text fontSize={10}>{category} 과다 식품</Text>
            </XStack>
          ))}
        </XStack>
      </DietaryGuideContainer>
    </YStack>
  )
}

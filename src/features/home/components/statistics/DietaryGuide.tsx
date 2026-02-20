import { Text, XStack, YStack, View } from "tamagui"
import { DietaryGuideContainer } from "./DietaryGuideContainer"
import {
  MOCK_SUMMARY,
  MOCK_CAUTION_FOODS,
  NUTRIENT_TAG_COLORS,
} from "../../data/dietaryGuideConstants"

export function DietaryGuide() {
  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text fontSize={22} fontWeight="700">
        식이 가이드
      </Text>

      <DietaryGuideContainer title="한줄평">
        <Text fontSize={14} color="$gray11" lineHeight={18}>
          {MOCK_SUMMARY}
        </Text>
      </DietaryGuideContainer>

      <Text fontSize={15} fontWeight="500" color="$colorSubtle">
        주의할 음식
      </Text>

      <DietaryGuideContainer title="나트륨 과다 식품">
        <XStack flexWrap="wrap" gap="$2">
          {MOCK_CAUTION_FOODS.map((food) => (
            <Text
              key={food.name}
              fontSize={13}
              fontWeight="600"
              backgroundColor={NUTRIENT_TAG_COLORS["나트륨"][0]}
              color={NUTRIENT_TAG_COLORS["나트륨"][1]}
              paddingHorizontal="$2"
              paddingVertical="$1.5"
              borderRadius="$4"
            >
              {food.name}
            </Text>
          ))}
        </XStack>
      </DietaryGuideContainer>
      <DietaryGuideContainer title="칼륨 과다 식품">
        <XStack flexWrap="wrap" gap="$2">
          {MOCK_CAUTION_FOODS.map((food) => (
            <Text
              key={food.name}
              fontSize={13}
              fontWeight="600"
              backgroundColor={NUTRIENT_TAG_COLORS["칼륨"][0]}
              color={NUTRIENT_TAG_COLORS["칼륨"][1]}
              paddingHorizontal="$2"
              paddingVertical="$1.5"
              borderRadius="$4"
            >
              {food.name}
            </Text>
          ))}
        </XStack>
      </DietaryGuideContainer>
      <DietaryGuideContainer title="인 과다 식품">
        <XStack flexWrap="wrap" gap="$2">
          {MOCK_CAUTION_FOODS.map((food) => (
            <Text
              key={food.name}
              fontSize={13}
              fontWeight="600"
              backgroundColor={NUTRIENT_TAG_COLORS["인"][0]}
              color={NUTRIENT_TAG_COLORS["인"][1]}
              paddingHorizontal="$2"
              paddingVertical="$1.5"
              borderRadius="$4"
            >
              {food.name}
            </Text>
          ))}
        </XStack>
      </DietaryGuideContainer>
    </YStack>
  )
}

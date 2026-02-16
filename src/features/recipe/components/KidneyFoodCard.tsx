import { YStack, Text } from "tamagui"
import { Pressable, Animated } from "react-native"
import { useRef, useCallback } from "react"
import { KidneyRecommendedFood } from "../types"
import { ScoreGauge } from "./ScoreGauge"
import { NutrientChip } from "./NutrientChip"

interface KidneyFoodCardProps {
  item: KidneyRecommendedFood
  onPress: (item: KidneyRecommendedFood) => void
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "매우 좋음"
  if (score >= 60) return "좋음"
  if (score >= 40) return "보통"
  return "주의"
}

export function KidneyFoodCard({ item, onPress }: KidneyFoodCardProps) {
  const mainTag = item.tags[0]
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }, [scaleAnim])

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }, [scaleAnim])

  return (
    <Pressable
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <YStack
          backgroundColor="#ffffff"
          padding="$4"
          paddingTop="$4"
          paddingBottom="$3"
          alignItems="center"
          gap="$2.5"
          width={170}
          borderRadius="$6"
        >
          <ScoreGauge score={item.score} size={80} strokeWidth={8} />

          <YStack alignItems="center" gap="$1">
            <Text
              fontSize="$4"
              fontWeight="600"
              color="$color"
              numberOfLines={1}
              textAlign="center"
              width={138}
            >
              {item.food.name}
            </Text>

            <Text fontSize={11} color="$colorSubtle">
              {getScoreLabel(item.score)}
            </Text>
          </YStack>

          {mainTag && <NutrientChip label={mainTag} variant="beneficial" />}
        </YStack>
      </Animated.View>
    </Pressable>
  )
}

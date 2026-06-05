import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { Image } from "expo-image"
import { tokens } from "@/src/theme/tokens"
import type { Restaurant } from "../types"

const COLORS = {
  light: {
    text: tokens.color.textLight.val,
    description: "#8E8E93",
    tagBg: "#F2F2F7",
    tagText: "#636366",
  },
  dark: {
    text: tokens.color.textDark.val,
    description: "#8E8E93",
    tagBg: tokens.color.cardBgDark.val,
    tagText: tokens.color.textDarkSub.val,
  },
} as const

const CARD_WIDTH = 160

interface RestaurantCardProps {
  restaurant: Restaurant
  onPress?: () => void
}

export function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
    <YStack width={CARD_WIDTH} gap={8}>
      <Image
        source={
          typeof restaurant.imageUri === "number"
            ? restaurant.imageUri
            : { uri: restaurant.imageUri }
        }
        style={{
          width: CARD_WIDTH,
          height: CARD_WIDTH * 0.82,
          borderRadius: 12,
        }}
        contentFit="cover"
      />
      <YStack gap={4}>
        <Text
          fontSize={15}
          fontWeight="600"
          fontFamily="$body"
          color={palette.text}
          numberOfLines={1}
        >
          {restaurant.name}
        </Text>
        <Text
          fontSize={13}
          fontFamily="$body"
          color={palette.description}
          numberOfLines={1}
        >
          {restaurant.description}
        </Text>
      </YStack>
      <XStack gap={6} flexWrap="wrap">
        {restaurant.tags.map((tag) => (
          <XStack
            key={tag}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={6}
            backgroundColor={palette.tagBg}
          >
            <Text fontSize={11} fontFamily="$body" color={palette.tagText}>
              {tag}
            </Text>
          </XStack>
        ))}
      </XStack>
    </YStack>
    </Pressable>
  )
}

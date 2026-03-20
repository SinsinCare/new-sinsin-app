import { ScrollView, useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { RestaurantCard } from "./RestaurantCard"
import type { CurationSectionData } from "../types"

const COLORS = {
  light: {
    title: "#2A2A37",
    subtitle: "#8E8E93",
  },
  dark: {
    title: "#E7E7EE",
    subtitle: "#8E8E93",
  },
} as const

interface CurationSectionProps {
  section: CurationSectionData
}

export function CurationSection({ section }: CurationSectionProps) {
  const isDark = useColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <YStack paddingHorizontal={16} gap={12}>
      <YStack gap={4}>
        <Text
          fontSize={20}
          fontWeight="700"
          fontFamily="$body"
          color={palette.title}
        >
          {section.title}
        </Text>
        <Text fontSize={14} fontFamily="$body" color={palette.subtitle}>
          {section.subtitle}
        </Text>
      </YStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}
      >
        {section.restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </ScrollView>
    </YStack>
  )
}

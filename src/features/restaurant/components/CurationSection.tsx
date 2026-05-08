import { ScrollView } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { RestaurantCard } from "./RestaurantCard"
import type { CurationSectionData } from "../types"

const COLORS = {
  light: {
    title: tokens.color.textLight.val,
    subtitle: "#8E8E93",
  },
  dark: {
    title: tokens.color.textDark.val,
    subtitle: "#8E8E93",
  },
} as const

interface CurationSectionProps {
  section: CurationSectionData
}

export function CurationSection({ section }: CurationSectionProps) {
  const isDark = useAppColorScheme() === "dark"
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

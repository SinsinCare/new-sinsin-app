import React from "react"
import { Pressable, ScrollView, useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"

import WindowIcon from "@/assets/images/window.svg"
import KoreanIcon from "@/assets/images/korean.svg"
import ChineseIcon from "@/assets/images/chinese.svg"
import JapaneseIcon from "@/assets/images/japanese.svg"
import AmericanIcon from "@/assets/images/american.svg"
import SaladIcon from "@/assets/images/salad.svg"
import DessertIcon from "@/assets/images/dessert.svg"
import DrinkIcon from "@/assets/images/drink.svg"

const CATEGORIES = [
  { key: "all", label: "\uC804\uCCB4", Icon: WindowIcon },
  { key: "korean", label: "\uD55C\uC2DD", Icon: KoreanIcon },
  { key: "chinese", label: "\uC911\uC2DD", Icon: ChineseIcon },
  { key: "japanese", label: "\uC77C\uC2DD", Icon: JapaneseIcon },
  { key: "american", label: "\uC591\uC2DD", Icon: AmericanIcon },
  { key: "salad", label: "\uC0D0\uB7EC\uB4DC", Icon: SaladIcon },
  { key: "dessert", label: "\uB514\uC800\uD2B8", Icon: DessertIcon },
  { key: "drink", label: "\uC74C\uB8CC", Icon: DrinkIcon },
] as const

const TEXT_COLORS = {
  light: "#000000",
  dark: "#FFFFFF",
} as const

interface FoodCategoryBarProps {
  selectedCategories: Set<string>
  onToggleCategory: (key: string) => void
}

export function FoodCategoryBar({
  selectedCategories,
  onToggleCategory,
}: FoodCategoryBarProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const activeTextColor = isDark ? TEXT_COLORS.dark : TEXT_COLORS.light

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {CATEGORIES.map(({ key, label, Icon }) => {
        const isAllButton = key === "all"
        const isActive = isAllButton
          ? selectedCategories.size === 0
          : selectedCategories.has(key)
        const opacity = isActive ? 1 : 0.35

        return (
          <Pressable
            key={key}
            onPress={() => onToggleCategory(key)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              alignItems: "center",
              width: 60,
            })}
          >
            <YStack alignItems="center" gap={6} opacity={opacity}>
              <Icon width={38} height={38} />
              <Text
                fontSize={13}
                fontWeight="500"
                fontFamily="$body"
                color={activeTextColor}
              >
                {label}
              </Text>
            </YStack>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

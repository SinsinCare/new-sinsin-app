import React from "react"
import { Pressable, ScrollView, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
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
  { key: "all", label: "전체", Icon: WindowIcon },
  { key: "korean", label: "한식", Icon: KoreanIcon },
  { key: "chinese", label: "중식", Icon: ChineseIcon },
  { key: "japanese", label: "일식", Icon: JapaneseIcon },
  { key: "american", label: "양식", Icon: AmericanIcon },
  { key: "salad", label: "샐러드", Icon: SaladIcon },
  { key: "dessert", label: "디저트", Icon: DessertIcon },
  { key: "drink", label: "음료", Icon: DrinkIcon },
] as const

const TEXT_COLORS = {
  light: "#000000",
  dark: "#FFFFFF",
} as const

interface FoodCategoryBarProps {
  selectedCategories: Set<string>
  onToggleCategory: (key: string, isSelected: boolean) => void
  onToggleAllCategories: (isSelected: boolean) => void
}

export function FoodCategoryBar({
  selectedCategories,
  onToggleCategory,
  onToggleAllCategories,
}: FoodCategoryBarProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const activeTextColor = isDark ? TEXT_COLORS.dark : TEXT_COLORS.light

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}
    >
      {CATEGORIES.map(({ key, label, Icon }) => {
        const isAllButton = key === "all"
        const isActive = isAllButton
          ? selectedCategories.size === 0
          : selectedCategories.has(key)
        const opacity = isActive ? 1 : 0.5

        return (
          <Pressable
            key={key}
            onPress={() => {
              if (key === "all") {
                onToggleAllCategories(isActive)
              } else {
                onToggleCategory(key, isActive)
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              alignItems: "center",
              width: 60,
            })}
          >
            <YStack alignItems="center" gap={6} opacity={opacity}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <Icon height={34} />
              </View>
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

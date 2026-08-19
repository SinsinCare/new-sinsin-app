import React from "react"
import { pngIcon } from "@/src/shared/components/pngIcon"
import { Pressable, ScrollView, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2Text, V2VStack } from "@/src/design-system-v2"

import WindowIcon from "@/assets/images/window.svg"
import AmericanIcon from "@/assets/images/american.svg"
import SaladIcon from "@/assets/images/salad.svg"
import DessertIcon from "@/assets/images/dessert.svg"
import DrinkIcon from "@/assets/images/drink.svg"
import { useTranslation } from "react-i18next"

const KoreanIcon = pngIcon(
  require("@/assets/images/cuisine-korean.png"),
  "cuisine-korean.png",
)
const ChineseIcon = pngIcon(
  require("@/assets/images/cuisine-chinese.png"),
  "cuisine-chinese.png",
)
const JapaneseIcon = pngIcon(
  require("@/assets/images/cuisine-japanese.png"),
  "cuisine-japanese.png",
)

const CATEGORIES = [
  { key: "all", labelKey: "category.food.all", Icon: WindowIcon },
  { key: "korean", labelKey: "category.food.korean", Icon: KoreanIcon },
  { key: "chinese", labelKey: "category.food.chinese", Icon: ChineseIcon },
  { key: "japanese", labelKey: "category.food.japanese", Icon: JapaneseIcon },
  { key: "american", labelKey: "category.food.american", Icon: AmericanIcon },
  { key: "salad", labelKey: "category.food.salad", Icon: SaladIcon },
  { key: "dessert", labelKey: "category.food.dessert", Icon: DessertIcon },
  { key: "drink", labelKey: "category.food.drink", Icon: DrinkIcon },
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
  const { t } = useTranslation("recipe")
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const activeTextColor = isDark ? TEXT_COLORS.dark : TEXT_COLORS.light

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}
    >
      {CATEGORIES.map(({ key, labelKey, Icon }) => {
        const label = t(labelKey)
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
            <V2VStack align="center" gap={6} style={{ opacity: opacity }}>
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
              <V2Text color={activeTextColor} style={{ fontSize: 13, fontWeight: "500" }}>
                {label}
              </V2Text>
            </V2VStack>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

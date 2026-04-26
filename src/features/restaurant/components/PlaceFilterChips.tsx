import { Pressable, StyleSheet, useColorScheme } from "react-native"
import { Text, XStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { FilterTab } from "../types"

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "region", label: "지역" },
  { key: "foodType", label: "음식 종류" },
  { key: "nutrient", label: "영양소 제한" },
]

interface PlaceFilterChipsProps {
  onFilterPress?: (filterKey: FilterTab) => void
}

export function PlaceFilterChips({ onFilterPress }: PlaceFilterChipsProps) {
  const isDarkMode = useColorScheme() === "dark"

  const borderColor = isDarkMode ? "#36363E" : "#D9D9DF"
  const textColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"

  return (
    <XStack gap={8} paddingHorizontal={16} paddingVertical={12}>
      {FILTERS.map((filter) => (
        <Pressable
          key={filter.key}
          onPress={() => onFilterPress?.(filter.key)}
          style={[styles.chip, { borderColor }]}
        >
          <Text
            fontFamily="$body"
            fontWeight="500"
            fontSize={14}
            lineHeight={20}
            color={textColor}
          >
            {filter.label}
          </Text>
          <Text
            fontFamily="$body"
            fontSize={12}
            color={textColor}
            marginLeft={2}
          >
            ▾
          </Text>
        </Pressable>
      ))}
    </XStack>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
})

import { Pressable, ScrollView, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text } from "tamagui"
import { useTranslation } from "react-i18next"
import { tokens } from "@/src/theme/tokens"
import type { FilterTab } from "../types"

const FILTERS = [
  { key: "region", labelKey: "restaurant.filter.region" },
  { key: "foodType", labelKey: "restaurant.filter.foodType" },
  { key: "nutrient", labelKey: "restaurant.filter.nutrient" },
] as const satisfies readonly { key: FilterTab; labelKey: string }[]

interface PlaceFilterChipsProps {
  onFilterPress?: (filterKey: FilterTab) => void
}

export function PlaceFilterChips({ onFilterPress }: PlaceFilterChipsProps) {
  const { t } = useTranslation("common")
  const isDarkMode = useAppColorScheme() === "dark"

  const borderColor = isDarkMode ? "#36363E" : "#D9D9DF"
  const textColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"

  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTERS.map((filter) => (
        <Pressable
          key={filter.key}
          onPress={() => onFilterPress?.(filter.key)}
          accessibilityRole="button"
          accessibilityLabel={t(filter.labelKey)}
          style={[styles.chip, { borderColor }]}
        >
          <Text
            fontFamily="$body"
            fontWeight="500"
            fontSize={14}
            lineHeight={20}
            color={textColor}
          >
            {t(filter.labelKey)}
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
})

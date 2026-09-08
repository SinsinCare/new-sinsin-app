import type { RecipeCategoryCarouselItemModel } from "./recipeCategoryArtModel"
import type { RECIPE_CATEGORY_ART } from "./RecipeCategoryArt"
import { memo } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import {
  V2Text,
  borderWidth,
  radius,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"
import { RECIPE_FILTER_GROUP_VIEWS } from "./recipeListFilterModel"
import { RECIPE_CATEGORY_RAIL } from "./recipeHomeStickyLayout"

export interface RecipeCategoryCarouselItem extends RecipeCategoryCarouselItemModel {
  Icon: (typeof RECIPE_CATEGORY_ART)[number]["Icon"]
}

export interface RecipeCategoryCarouselProps {
  selected: readonly string[]
  onToggle: (categoryQueryValue: string) => void
  onClearAll: () => void
}
export const RecipeCategoryCarousel = memo(function RecipeCategoryCarousel({
  selected,
  onToggle,
  onClearAll,
}: RecipeCategoryCarouselProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const category = RECIPE_FILTER_GROUP_VIEWS.find(
    (group) => group.key === "category",
  )!
  const options = [
    { key: "all", label: t("browse.all"), value: null },
    ...category.options.map((option) => ({
      key: option.key,
      label: t(option.labelKey),
      value: option.queryValue,
    })),
  ]
  return (
    <ScrollView
      horizontal
      bounces={false}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.track}
    >
      {options.map((option) => {
        const active =
          option.value === null
            ? selected.length === 0
            : selected.includes(option.value)
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            onPress={() =>
              option.value === null ? onClearAll() : onToggle(option.value)
            }
            style={({ pressed }) => [
              styles.target,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? colors.label.normal
                    : colors.background.default,
                  borderColor: active
                    ? colors.label.normal
                    : colors.line.normal,
                },
              ]}
            >
              <V2Text
                token={active ? "label.xSmall" : "subtext.medium"}
                color={
                  active ? colors.background.default : colors.label.neutral
                }
              >
                {option.label}
              </V2Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})
const styles = StyleSheet.create({
  track: {
    paddingHorizontal: spacing[20],
    gap: spacing[6],
    alignItems: "center",
  },
  target: { paddingVertical: RECIPE_CATEGORY_RAIL.slotPadV },
  chip: {
    minHeight: RECIPE_CATEGORY_RAIL.chipHeight,
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: "center",
    justifyContent: "center",
  },
})

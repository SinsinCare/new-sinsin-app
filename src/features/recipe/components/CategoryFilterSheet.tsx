// src/features/recipe/components/CategoryFilterSheet.tsx
import { useState, useEffect } from "react"
import { Pressable, ScrollView } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import { FilterChip } from "./FilterChip"
import {
  AppBottomSheet,
  AppBottomSheetScrollView,
} from "@/src/shared/components"
import { useTranslation } from "react-i18next"

interface CategoryFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFilters: Record<string, Set<string>>
  onApply: (filters: Record<string, Set<string>>) => void
}

const CATEGORY_SECTIONS = [
  {
    key: "nutrition",
    titleKey: "filter.nutrition",
    chips: [
      { key: "low-salt", labelKey: "category.nutrition.low-salt" },
      { key: "low-protein", labelKey: "category.nutrition.low-protein" },
      { key: "low-potassium", labelKey: "category.nutrition.low-potassium" },
      { key: "low-phosphorus", labelKey: "category.nutrition.low-phosphorus" },
      { key: "high-calorie", labelKey: "category.nutrition.high-calorie" },
    ],
  },
  {
    key: "stage",
    titleKey: "filter.stage",
    chips: [
      { key: "ckd3", labelKey: "category.stage.ckd3" },
      { key: "ckd4", labelKey: "category.stage.ckd4" },
      { key: "ckd5", labelKey: "category.stage.ckd5" },
      { key: "diabetes", labelKey: "category.stage.diabetes" },
      { key: "hypertension", labelKey: "category.stage.hypertension" },
    ],
  },
  {
    key: "country",
    titleKey: "filter.food",
    chips: [
      { key: "korean", labelKey: "category.food.korean" },
      { key: "chinese", labelKey: "category.food.chinese" },
      { key: "japanese", labelKey: "category.food.japanese" },
      { key: "western", labelKey: "category.food.western" },
      { key: "salad", labelKey: "category.food.salad" },
      { key: "dessert", labelKey: "category.food.dessert" },
      { key: "beverage", labelKey: "category.food.beverage" },
    ],
  },
] as const

const CHIP_THEME = {
  nutrition: "primary",
  country: "tertiary",
  stage: "sub",
} as const

const HEADER_COLORS = {
  light: { close: "#3C3C43", title: "#3C3C43", apply: "#EE6145" },
  dark: {
    close: tokens.color.textDark.val,
    title: tokens.color.textDark.val,
    apply: "#E77661",
  },
} as const

const SECTION_TITLE_COLORS = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
} as const

const SHEET_BG = {
  light: "#FFFFFF",
  dark: tokens.color.cardBgDark.val,
} as const

const FILTER_SNAP_POINTS = [48, 70]

function cloneFilters(
  filters: Record<string, Set<string>>,
): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  for (const key of Object.keys(filters)) {
    result[key] = new Set(filters[key])
  }
  return result
}

export function CategoryFilterSheet({
  open,
  onOpenChange,
  selectedFilters,
  onApply,
}: CategoryFilterSheetProps) {
  const { t } = useTranslation("recipe")
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const colors = isDark ? HEADER_COLORS.dark : HEADER_COLORS.light
  const sectionTitleColor = isDark
    ? SECTION_TITLE_COLORS.dark
    : SECTION_TITLE_COLORS.light
  const sheetBg = isDark ? SHEET_BG.dark : SHEET_BG.light

  const [tempFilters, setTempFilters] = useState<Record<string, Set<string>>>(
    () => cloneFilters(selectedFilters),
  )

  useEffect(() => {
    if (open) {
      setTempFilters(cloneFilters(selectedFilters))
    }
  }, [open, selectedFilters])

  const toggleChip = (sectionKey: string, chipKey: string) => {
    setTempFilters((prev) => {
      const next = cloneFilters(prev)
      if (!next[sectionKey]) {
        next[sectionKey] = new Set()
      }
      if (next[sectionKey].has(chipKey)) {
        next[sectionKey].delete(chipKey)
      } else {
        next[sectionKey].add(chipKey)
      }
      return next
    })
  }

  const handleApply = () => {
    onApply(tempFilters)
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <AppBottomSheet
      visible={open}
      onClose={() => onOpenChange(false)}
      snapPoints={FILTER_SNAP_POINTS}
      disableDrag
    >
      <YStack flex={1} backgroundColor={sheetBg} paddingTop={4}>
        {/* Header */}
        <XStack
          paddingHorizontal={20}
          paddingTop={4}
          paddingBottom={16}
          justifyContent="space-between"
          alignItems="center"
        >
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Icon name="x" size={24} color={colors.close} />
          </Pressable>
          <Text
            fontSize={16}
            fontWeight="600"
            fontFamily="$body"
            color={colors.title}
          >
            {t("filter.title")}
          </Text>
          <Pressable
            onPress={handleApply}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              fontSize={16}
              fontWeight="600"
              fontFamily="$body"
              color={colors.apply}
            >
              {t("action.apply")}
            </Text>
          </Pressable>
        </XStack>

        {/* Sections */}
        <AppBottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, gap: 20 }}
        >
          {CATEGORY_SECTIONS.map((section) => (
            <YStack key={section.key} gap={10}>
              <Text
                fontSize={15}
                fontWeight="700"
                fontFamily="$body"
                color={sectionTitleColor}
              >
                {t(section.titleKey)}
              </Text>
              <ScrollView
                bounces={false}
                overScrollMode="never"
                horizontal
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {section.chips.map((chip) => (
                  <FilterChip
                    key={chip.key}
                    label={t(chip.labelKey)}
                    theme={CHIP_THEME[section.key]}
                    selected={tempFilters[section.key]?.has(chip.key) ?? false}
                    onPress={() => toggleChip(section.key, chip.key)}
                  />
                ))}
              </ScrollView>
            </YStack>
          ))}
        </AppBottomSheetScrollView>
      </YStack>
    </AppBottomSheet>
  )
}

import { useEffect, useState } from "react"
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native"
import { useTranslation } from "react-i18next"
import {
  V2BottomSheet,
  V2SheetScrollView,
  V2Button,
  V2Text,
  V2IconButton,
  borderWidth,
  spacing,
  radius,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  clearRecipeFilters,
  countRecipeFilters,
  EMPTY_RECIPE_FILTERS,
  RECIPE_FILTER_GROUP_VIEWS,
  type RecipeFilterSelection,
  toggleRecipeFilter,
} from "./recipeListFilterModel"

interface RecipeFilterSheetProps {
  open: boolean
  onClose: () => void
  selection: RecipeFilterSelection
  onApply: (selection: RecipeFilterSelection) => void
}
export function RecipeFilterSheet({
  open,
  onClose,
  selection,
  onApply,
}: RecipeFilterSheetProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const { height: windowHeight } = useWindowDimensions()
  const [draft, setDraft] = useState<RecipeFilterSelection>(
    selection ?? EMPTY_RECIPE_FILTERS,
  )
  useEffect(() => {
    if (open) setDraft(selection)
  }, [open, selection])
  const count = countRecipeFilters(draft)
  return (
    <V2BottomSheet surface="recipe_filter" visible={open} onClose={onClose}>
      <View style={[styles.header, { borderBottomColor: colors.line.normal }]}>
        <V2Text token="label.smallStrong" color={colors.label.normal}>
          {t("filter.title")}
        </V2Text>
        <V2IconButton
          name="close"
          accessibilityLabel={t("action.close")}
          onPress={onClose}
        />
      </View>
      <V2SheetScrollView
        style={{ maxHeight: Math.round(windowHeight * 0.55) }}
        contentContainerStyle={styles.content}
      >
        {RECIPE_FILTER_GROUP_VIEWS.map((group) => (
          <View key={group.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <V2Text token="label.small" color={colors.label.normal}>
                {t(group.titleKey)}
              </V2Text>
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {t("browse.multiple")}
              </V2Text>
            </View>
            <View style={styles.options}>
              {group.options.map((option) => {
                const selected = draft[group.key]?.includes(option.key) ?? false
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t(option.labelKey)}
                    accessibilityState={{ checked: selected }}
                    onPress={() =>
                      setDraft((prev) =>
                        toggleRecipeFilter(prev, group.key, option.key),
                      )
                    }
                    style={({ pressed }) => [
                      styles.target,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.option,
                        {
                          backgroundColor: selected
                            ? colors.label.normal
                            : colors.background.default,
                          borderColor: selected
                            ? colors.label.normal
                            : colors.line.normal,
                        },
                      ]}
                    >
                      <V2Text
                        token={selected ? "label.xSmall" : "subtext.medium"}
                        color={
                          selected
                            ? colors.background.default
                            : colors.label.neutral
                        }
                      >
                        {t(option.labelKey)}
                      </V2Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </V2SheetScrollView>
      <View style={[styles.footer, { borderTopColor: colors.line.normal }]}>
        <V2Button
          color="neutral"
          variant="weak"
          size="m"
          onPress={() => setDraft(clearRecipeFilters())}
          disabled={count === 0}
          style={styles.reset}
        >
          {t("list.filterClearAll")}
        </V2Button>
        <V2Button
          color="brand"
          size="m"
          style={styles.apply}
          onPress={() => {
            onApply(draft)
            onClose()
          }}
        >
          {t("action.apply")}
          {count > 0 ? ` ${count}` : ""}
        </V2Button>
      </View>
    </V2BottomSheet>
  )
}
const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[20],
    borderBottomWidth: borderWidth.thin,
  },
  content: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
    paddingBottom: spacing[20],
    gap: spacing[24],
  },
  section: { gap: spacing[8] },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  options: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing[8] },
  target: { paddingVertical: spacing[6] },
  option: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  footer: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[12],
    flexDirection: "row",
    gap: spacing[8],
    borderTopWidth: borderWidth.thin,
  },
  reset: { flex: 1 },
  apply: { flex: 2 },
})

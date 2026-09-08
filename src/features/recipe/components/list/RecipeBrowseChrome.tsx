import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  V2Text,
  V2Icon,
  spacing,
  borderWidth,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { HeaderIconButton } from "@/src/shared/components"
import { Icon } from "@/src/shared/components/Icon"
import { showActionSheet } from "@/src/lib/dialog"
import type { RecipeBrowseScreenModel } from "../../hooks/useRecipeBrowseScreen"
import { RECIPE_SORT_KEYS, type RecipeSortKey } from "../../types/recipeListV2"
import { RecipeSearchField } from "./RecipeSearchField"
import { RecipeCategoryCarousel } from "./RecipeCategoryCarousel"
import { RECIPE_STICKY } from "./recipeHomeStickyLayout"

const SORT_LABEL_KEYS = {
  recommended: "list.sort.recommended",
  recent: "list.sort.recent",
  rating: "list.sort.rating",
  saves: "list.sort.saves",
  quick: "list.sort.quick",
} as const satisfies Record<RecipeSortKey, string>

export function RecipeBrowseHeader({
  model: m,
  onOpenSaved,
  onWrite,
}: {
  model: RecipeBrowseScreenModel
  onOpenSaved: () => void
  onWrite: () => void
}) {
  const { t } = useTranslation("recipe")
  const { t: common } = useTranslation("common")
  const { colors } = useV2Theme()
  return (
    <View style={[styles.header, { borderBottomColor: colors.line.normal }]}>
      <View style={styles.titleRow}>
        <V2Text style={typography.title.medium} color={colors.label.normal}>
          {common("recipe.title")}
        </V2Text>
        <View style={styles.actions}>
          <HeaderIconButton
            onPress={onOpenSaved}
            accessibilityLabel={t("archive.title")}
          >
            <V2Icon name="bookmark" size="sm" color={colors.label.normal} />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={onWrite}
            accessibilityLabel={common("recipe.write")}
          >
            <Icon name="pencil" size={20} color={colors.label.normal} />
          </HeaderIconButton>
        </View>
      </View>
      <View style={styles.search}>
        <RecipeSearchField
          value={m.search.draft}
          onChangeText={m.search.setDraft}
          onSubmit={() => m.handleCommitSearch()}
          onClear={m.handleClearSearch}
          onFocus={m.search.focus}
          onBlur={m.search.blur}
          onOpenFilters={() => m.setFilterSheetOpen(true)}
          appliedFilterCount={m.appliedCount}
        />
      </View>
      {m.showStickyCategoryRail && (
        <View style={{ paddingTop: RECIPE_STICKY.searchToRailGap }}>
          <RecipeCategoryCarousel
            selected={m.selectedCategoryQueryValues}
            onToggle={m.handleToggleCategory}
            onClearAll={m.handleClearCategories}
          />
        </View>
      )}
    </View>
  )
}

export function RecipeResultsHeader({
  model: m,
}: {
  model: RecipeBrowseScreenModel
}) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const openSort = async () => {
    const picked = await showActionSheet({
      title: t("browse.sortTitle"),
      actions: RECIPE_SORT_KEYS.map((key) => ({
        label: t(SORT_LABEL_KEYS[key]),
      })),
    })
    if (picked != null && RECIPE_SORT_KEYS[picked])
      m.changeSort(RECIPE_SORT_KEYS[picked])
  }
  return (
    <View style={styles.results}>
      <View style={styles.resultRow}>
        <V2Text
          token={m.showResultCount ? "label.xSmall" : "label.smallStrong"}
          color={colors.label.normal}
          style={styles.resultTitle}
          numberOfLines={1}
        >
          {m.showResultCount ? m.resultCountText : t("home.listTitle")}
        </V2Text>
        <Pressable
          onPress={openSort}
          accessibilityRole="button"
          accessibilityLabel={t("list.sortAccessibility", {
            label: t(SORT_LABEL_KEYS[m.sort]),
          })}
          style={({ pressed }) => [styles.sort, { opacity: pressed ? 0.6 : 1 }]}
        >
          <V2Text token="subtext.medium" color={colors.label.neutral}>
            {t(SORT_LABEL_KEYS[m.sort])}
          </V2Text>
          <V2Icon name="chevronDown" size="xs" color={colors.label.neutral} />
        </Pressable>
      </View>
      {m.showEstimateNotice && (
        <V2Text token="subtext.small" color={colors.label.neutral}>
          {t("list.estimateNotice")}
        </V2Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: RECIPE_STICKY.padTop,
    paddingBottom: RECIPE_STICKY.padBottom,
    borderBottomWidth: borderWidth.thin,
  },
  titleRow: {
    paddingHorizontal: spacing[20],
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[20],
    paddingVertical: spacing[4],
  },
  search: {
    paddingHorizontal: spacing[20],
    paddingTop: RECIPE_STICKY.titleToSearchGap,
  },
  results: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[2],
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: 44,
  },
  resultTitle: { flex: 1 },
  sort: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
})

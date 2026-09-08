import { useCallback } from "react"
import { StyleSheet, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { borderWidth, spacing, useV2Theme } from "@/src/design-system-v2"
import { FeatureIntroSheet, useFeatureIntro } from "@/src/features/coach"
import { useAppRouter } from "@/src/shared/navigation"
import { useRecipeBrowseScreen } from "../hooks/useRecipeBrowseScreen"
import type { RecipeCard } from "../types/recipeListV2"
import {
  AppliedFilterRow,
  RecipeFilterSheet,
  RecipeListSkeleton,
  RecipePhotoCard,
  RecipeSuggestPanel,
  recipeListBottomInset,
} from "../components/list"
import {
  RecipeBrowseHeader,
  RecipeResultsHeader,
} from "../components/list/RecipeBrowseChrome"
import { RecipeMealDiscovery } from "../components/list/RecipeMealDiscovery"
import { RecipeBrowseFeedback } from "../components/list/RecipeBrowseFeedback"

export function RecipeHomeScreen() {
  const router = useAppRouter()
  const intro = useFeatureIntro("recipe")
  const insets = useSafeAreaInsets()
  const { colors } = useV2Theme()
  const m = useRecipeBrowseScreen()
  const renderItem = useCallback(
    ({ item }: { item: RecipeCard }) => (
      <View style={styles.row}>
        <RecipePhotoCard
          card={item}
          variant="row"
          onPress={m.handleOpenRecipe}
        />
      </View>
    ),
    [m.handleOpenRecipe],
  )
  const separator = useCallback(
    () => (
      <View
        style={[styles.separator, { backgroundColor: colors.line.normal }]}
      />
    ),
    [colors.line.normal],
  )
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
      ]}
    >
      <FeatureIntroSheet
        feature="recipe"
        visible={intro.visible}
        onClose={intro.dismiss}
      />
      <RecipeBrowseHeader
        model={m}
        onOpenSaved={() => router.push("/recipe/saved")}
        onWrite={() => router.push("/(write)/recipe/new")}
      />
      {m.search.showSuggestions ? (
        <RecipeSuggestPanel
          draft={m.search.draft}
          suggestions={m.search.suggestions}
          isSuggesting={m.search.isSuggesting}
          onSelect={m.handleCommitSearch}
        />
      ) : (
        <>
          {m.visibleApplied.length > 0 && (
            <View style={styles.applied}>
              <AppliedFilterRow
                applied={m.visibleApplied}
                onRemove={m.handleRemoveFilter}
                onClearAll={m.clearFilters}
              />
            </View>
          )}
          <FlashList
            ref={m.listRef}
            data={m.list.items}
            keyExtractor={(card) => String(card.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={separator}
            style={styles.list}
            maintainVisibleContentPosition={{ disabled: true }}
            onScroll={(event) => {
              m.scrollOffsetRef.current = event.nativeEvent.contentOffset.y
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingBottom: recipeListBottomInset(insets.bottom),
            }}
            ListHeaderComponent={
              <>
                {m.showMealSections && <RecipeMealDiscovery model={m} />}
                <RecipeResultsHeader model={m} />
              </>
            }
            ListEmptyComponent={<RecipeBrowseFeedback model={m} />}
            ListFooterComponent={
              m.list.isFetchingNextPage ? (
                <RecipeListSkeleton count={2} />
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onEndReached={m.list.loadMore}
            onEndReachedThreshold={0.6}
            {...m.refreshable.scrollProps}
          />
        </>
      )}
      <RecipeFilterSheet
        open={m.filterSheetOpen}
        onClose={() => m.setFilterSheetOpen(false)}
        selection={m.filters}
        onApply={m.applyFilters}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { flex: 1 },
  row: { paddingHorizontal: spacing[20] },
  separator: { height: borderWidth.thin, marginHorizontal: spacing[20] },
  applied: { paddingVertical: spacing[8] },
})

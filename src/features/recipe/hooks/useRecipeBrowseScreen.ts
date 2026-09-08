import { useCallback, useMemo, useRef, useState } from "react"
import { Keyboard } from "react-native"
import type { FlashListRef } from "@shopify/flash-list"
import { useTranslation } from "react-i18next"
import {
  isAtScrollTop,
  useAppRouter,
  useRegisterTabReset,
} from "@/src/shared/navigation"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import { resolveError } from "@/src/lib/errorMessage"
import { RECIPE_LIST_REFRESH } from "../refresh/scopes"
import { useRecipeHome } from "./useRecipeHome"
import { useRecipeListV2 } from "./useRecipeListV2"
import { useRecipeSearch } from "./useRecipeSearch"
import type { RecipeCard, RecipeSortKey } from "../types/recipeListV2"
import {
  EMPTY_RECIPE_FILTERS,
  hasEstimatedNutrition,
  listAppliedRecipeFilters,
  removeRecipeFilter,
  countRecipeFilters,
  recipeCategoryOptionKeyForQueryValue,
  resolveSlotReasonCopy,
  resolveRecipeBrowseLayout,
  visibleAppliedRecipeFilters,
  clearRecipeFilterGroup,
  toggleRecipeFilter,
  toRecipeListQueryFilters,
  type RecipeFilterGroupKey,
  type RecipeFilterSelection,
} from "../components/list"

export function useRecipeBrowseScreen() {
  const router = useAppRouter()
  const { t: tr } = useTranslation("recipe")
  const [filters, setFilters] =
    useState<RecipeFilterSelection>(EMPTY_RECIPE_FILTERS)
  const [sort, setSort] = useState<RecipeSortKey>("recommended")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const search = useRecipeSearch()
  const list = useRecipeListV2({
    query: search.committedQuery,
    filters,
    sort,
  })
  const listFailure = useMemo(() => resolveError(list.error), [list.error])
  const {
    sections: homeSections,
    slotDecision: homeSlotDecision,
    isError: homeIsError,
    isLoading: homeIsLoading,
    refetch: refetchHome,
  } = useRecipeHome()
  const slotReason = useMemo(
    () => resolveSlotReasonCopy(homeSlotDecision),
    [homeSlotDecision],
  )
  const applied = useMemo(() => listAppliedRecipeFilters(filters), [filters])
  const appliedCount = useMemo(() => countRecipeFilters(filters), [filters])
  const showEstimateNotice = useMemo(
    () => hasEstimatedNutrition(list.items),
    [list.items],
  )
  const browseLayout = useMemo(
    () =>
      resolveRecipeBrowseLayout({
        isSearching: search.isSearching,
        appliedFilterCount: appliedCount,
      }),
    [search.isSearching, appliedCount],
  )
  const { showCategoryCarousel, showMealSections } = browseLayout
  const showStickyCategoryRail = showCategoryCarousel && !search.showSuggestions
  const visibleApplied = useMemo(
    () => visibleAppliedRecipeFilters(applied, browseLayout),
    [applied, browseLayout],
  )
  const showResultCount =
    (search.isSearching || appliedCount > 0) && !list.isLoading && !list.isError
  const resultCountText =
    list.resultCount.kind === "atLeast"
      ? tr("list.resultCountAtLeast", { count: list.resultCount.count })
      : tr("feed.results", { count: list.resultCount.count })
  const refreshable = useRefreshable({
    queryKeys: RECIPE_LIST_REFRESH,
    scope: "recipe-list",
  })
  useRevalidateOnReturn({ queryKeys: RECIPE_LIST_REFRESH })
  const listRef = useRef<FlashListRef<(typeof list.items)[number]>>(null)
  const scrollOffsetRef = useRef(0)
  useRegisterTabReset("recipe", {
    content: {
      isAtRoot: () => isAtScrollTop(scrollOffsetRef.current),
      reset: () =>
        listRef.current?.scrollToOffset({ offset: 0, animated: true }),
    },
    recover:
      list.isError && list.items.length === 0 ? refreshable.refresh : undefined,
  })
  const resetListToTop = useCallback(() => {
    scrollOffsetRef.current = 0
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [])
  const handleCommitSearch = useCallback(
    (text?: string) => {
      search.commit(text)
      Keyboard.dismiss()
      resetListToTop()
    },
    [search, resetListToTop],
  )
  const handleClearSearch = useCallback(() => {
    search.clear()
    resetListToTop()
  }, [search, resetListToTop])
  const handleRemoveFilter = useCallback(
    (group: RecipeFilterGroupKey, optionKey: string) => {
      setFilters((prev) => removeRecipeFilter(prev, group, optionKey))
      resetListToTop()
    },
    [resetListToTop],
  )
  const handleToggleCategory = useCallback(
    (categoryQueryValue: string) => {
      const optionKey = recipeCategoryOptionKeyForQueryValue(categoryQueryValue)
      if (optionKey == null) return
      setFilters((prev) => toggleRecipeFilter(prev, "category", optionKey))
      resetListToTop()
    },
    [resetListToTop],
  )
  const handleClearCategories = useCallback(() => {
    setFilters((prev) => clearRecipeFilterGroup(prev, "category"))
    resetListToTop()
  }, [resetListToTop])
  const selectedCategoryQueryValues = useMemo(
    () => toRecipeListQueryFilters(filters).categories,
    [filters],
  )
  const handleOpenRecipe = useCallback(
    (card: RecipeCard) => {
      router.push(`/recipe/${card.id}`)
    },
    [router],
  )

  const applyFilters = useCallback(
    (next: RecipeFilterSelection) => {
      setFilters(next)
      resetListToTop()
    },
    [resetListToTop],
  )
  const changeSort = useCallback(
    (next: RecipeSortKey) => {
      setSort(next)
      resetListToTop()
    },
    [resetListToTop],
  )
  const clearFilters = useCallback(
    () => applyFilters(EMPTY_RECIPE_FILTERS),
    [applyFilters],
  )
  const clearAll = useCallback(() => {
    applyFilters(EMPTY_RECIPE_FILTERS)
    handleClearSearch()
    search.blur()
    Keyboard.dismiss()
  }, [applyFilters, handleClearSearch, search])
  return {
    filters,
    appliedCount,
    filterSheetOpen,
    setFilterSheetOpen,
    applyFilters,
    sort,
    changeSort,
    search,
    list,
    listFailure,
    listRef,
    scrollOffsetRef,
    homeSections,
    homeSlotDecision,
    homeIsError,
    homeIsLoading,
    refetchHome,
    slotReason,
    showMealSections,
    showStickyCategoryRail,
    visibleApplied,
    showResultCount,
    resultCountText,
    showEstimateNotice,
    refreshable,
    selectedCategoryQueryValues,
    handleToggleCategory,
    handleClearCategories,
    handleRemoveFilter,
    handleOpenRecipe,
    handleCommitSearch,
    handleClearSearch,
    clearAll,
    clearFilters,
  }
}
export type RecipeBrowseScreenModel = ReturnType<typeof useRecipeBrowseScreen>

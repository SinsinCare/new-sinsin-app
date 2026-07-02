import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text, XStack, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  TopTabBar,
  type TabItem,
} from "@/src/features/recipe/components/TabBar"
import { useLocalSearchParams, useRouter, type Href } from "expo-router"
import { Icon } from "@/src/shared/components/Icon"
import { SearchInput } from "@/src/features/recipe/components/SearchInput"
import { FilterChip } from "@/src/features/recipe/components/FilterChip"
import { CategoryFilterSheet } from "@/src/features/recipe/components/CategoryFilterSheet"
import { FoodCategoryBar } from "@/src/features/recipe/components/FoodCategoryBar"
import { WriteTypeSheet } from "@/src/features/recipe/components/WriteTypeSheet"
import { FreePostTab } from "@/src/features/recipe/components/FreePostTab"
import { RecipeEditor } from "@/src/features/recipe/components/RecipeEditor"
import { CuratedRecipeCard } from "@/src/features/recipe/components/CuratedRecipeCard"
import { CuratedRecipeDetailSheet } from "@/src/features/recipe/components/CuratedRecipeDetailSheet"
import { useInfiniteRecipes } from "@/src/features/recipe/hooks/useInfiniteRecipes"
import { useRecipeDetail } from "@/src/features/recipe/hooks/useRecipeDetail"
import type { CuratedRecipe } from "@/src/features/recipe/data/curatedRecipeTypes"
import { tokens } from "@/src/theme/tokens"
// Chip key → label mapping for CategoryFilterSheet
const CHIP_KEY_TO_LABEL: Record<string, Record<string, string>> = {
  nutrition: {
    "low-salt": "저염",
    "low-protein": "저단백",
    "low-potassium": "저칼륨",
    "low-phosphorus": "저인",
    "high-calorie": "고열량",
  },
  stage: {
    ckd3: "CKD 3기",
    ckd4: "CKD 4기",
    ckd5: "CKD 5기",
    diabetes: "당뇨동반",
    hypertension: "고혈압동반",
  },
  country: {
    korean: "한식",
    chinese: "중식",
    japanese: "일식",
    western: "양식",
    salad: "샐러드",
    dessert: "디저트",
    beverage: "음료",
  },
}

// All possible filter chips for nutrition + stage
const ALL_FILTER_CHIPS = [
  ...Object.entries(CHIP_KEY_TO_LABEL.nutrition).map(([key, label]) => ({
    key,
    label: `#${label}`,
    theme: "primary" as const,
    section: "nutrition",
  })),
  ...Object.entries(CHIP_KEY_TO_LABEL.stage).map(([key, label]) => ({
    key,
    label: `#${label}`,
    theme: "sub" as const,
    section: "stage",
  })),
]

const RECIPE_TABS: TabItem[] = [
  { key: "recipe", label: "레시피" },
  { key: "free", label: "자유글" },
]

const ICON_COLORS = {
  light: "#8E8E93",
  dark: "#66666B",
} as const

export default function RecipeScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ tab?: string; tag?: string }>()
  const router = useRouter()
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [activeTab, setActiveTab] = useState(
    params.tab === "free" ? "free" : "recipe",
  )
  const [freePostTagFilter, setFreePostTagFilter] = useState<string | null>(
    typeof params.tag === "string" && params.tag.length > 0 ? params.tag : null,
  )
  const iconColor = isDarkMode ? ICON_COLORS.dark : ICON_COLORS.light

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    Keyboard.dismiss()
  }

  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [writeSheetOpen, setWriteSheetOpen] = useState(false)
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [recipeRefreshing, setRecipeRefreshing] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({})
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (params.tab === "free") {
      setActiveTab("free")
    }
    if (typeof params.tag === "string") {
      setFreePostTagFilter(params.tag.length > 0 ? params.tag : null)
    }
  }, [params.tab, params.tag])

  // FoodCategoryBar uses selectedFilters.country directly
  const selectedCategories = useMemo(() => {
    return selectedFilters.country ?? new Set<string>()
  }, [selectedFilters])

  const selectedNutrition = useMemo(() => {
    return selectedFilters.nutrition ?? new Set<string>()
  }, [selectedFilters])

  const selectedStage = useMemo(() => {
    return selectedFilters.stage ?? new Set<string>()
  }, [selectedFilters])

  const categoryKeys = useMemo(
    () => [...selectedCategories].sort(),
    [selectedCategories],
  )

  const tagKeys = useMemo(
    () => [...selectedNutrition, ...selectedStage].sort(),
    [selectedNutrition, selectedStage],
  )

  const {
    data: recipePages,
    isLoading: recipesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchRecipes,
  } = useInfiniteRecipes({
    search: debouncedSearch,
    categoryKeys,
    tagKeys,
  })

  const recipes = useMemo(
    () => recipePages?.pages.flatMap((page) => page.items) ?? [],
    [recipePages],
  )

  const { data: selectedRecipe } = useRecipeDetail(selectedRecipeId)

  const handleToggleCategory = useCallback((key: string) => {
    setSelectedFilters((prev) => {
      const next: Record<string, Set<string>> = {}
      for (const k of Object.keys(prev)) {
        next[k] = new Set(prev[k])
      }
      if (!next.country) {
        next.country = new Set()
      }
      if (next.country.has(key)) {
        next.country.delete(key)
      } else {
        next.country.add(key)
      }
      return next
    })
  }, [])

  const handleToggleAllCategories = useCallback((_isSelected: boolean) => {
    setSelectedFilters((prev) => {
      const next: Record<string, Set<string>> = {}
      for (const k of Object.keys(prev)) {
        next[k] = new Set(prev[k])
      }
      next.country = new Set()
      return next
    })
  }, [])

  const handleToggleQuickFilter = useCallback(
    (chipKey: string, section: string) => {
      setSelectedFilters((prev) => {
        const next: Record<string, Set<string>> = {}
        for (const key of Object.keys(prev)) {
          next[key] = new Set(prev[key])
        }
        if (!next[section]) {
          next[section] = new Set()
        }
        if (next[section].has(chipKey)) {
          next[section].delete(chipKey)
        } else {
          next[section].add(chipKey)
        }
        return next
      })
    },
    [],
  )

  const isChipSelected = useCallback(
    (chipKey: string, section: string) => {
      return selectedFilters[section]?.has(chipKey) ?? false
    },
    [selectedFilters],
  )

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const handleRefreshRecipes = useCallback(async () => {
    if (recipeRefreshing) {
      return
    }
    setRecipeRefreshing(true)
    try {
      await refetchRecipes()
    } finally {
      setRecipeRefreshing(false)
    }
  }, [recipeRefreshing, refetchRecipes])

  const renderRecipeItem = useCallback(
    ({ item, index }: { item: CuratedRecipe; index: number }) => (
      <View
        style={[
          styles.recipeItem,
          index % 2 === 0 ? styles.recipeItemLeft : styles.recipeItemRight,
        ]}
      >
        <CuratedRecipeCard
          recipe={item}
          onPress={() => setSelectedRecipeId(item.id)}
        />
      </View>
    ),
    [],
  )

  const recipeKeyExtractor = useCallback((item: CuratedRecipe) => {
    return String(item.id)
  }, [])

  return (
    <YStack flex={1}>
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <YStack
          flex={1}
          backgroundColor={isDarkMode ? "#1F1F21" : "#FCFCFC"}
          paddingTop={insets.top}
        >
          <TopTabBar
            tabs={RECIPE_TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          {activeTab === "recipe" && (
            <>
              <YStack paddingHorizontal={16} paddingVertical={14} gap={16}>
                <XStack alignItems="center" gap={12}>
                  <View style={{ flex: 1 }}>
                    <SearchInput value={search} onChangeText={setSearch} />
                  </View>
                  <Pressable
                    onPress={() => setFilterSheetOpen(true)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <Icon name="filter" size={24} color={iconColor} />
                  </Pressable>
                </XStack>
                {ALL_FILTER_CHIPS.some((chip) =>
                  isChipSelected(chip.key, chip.section),
                ) && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {ALL_FILTER_CHIPS.filter((chip) =>
                      isChipSelected(chip.key, chip.section),
                    ).map((chip) => (
                      <FilterChip
                        key={chip.key}
                        label={chip.label}
                        theme={chip.theme}
                        selected
                        onPress={() =>
                          handleToggleQuickFilter(chip.key, chip.section)
                        }
                      />
                    ))}
                  </ScrollView>
                )}
                <FoodCategoryBar
                  selectedCategories={selectedCategories}
                  onToggleCategory={handleToggleCategory}
                  onToggleAllCategories={handleToggleAllCategories}
                />
              </YStack>
              <View
                height={6}
                backgroundColor={
                  isDarkMode
                    ? tokens.color.cardBgDark.val
                    : tokens.color.grey8.val
                }
              />
              <FlatList
                data={recipes}
                keyExtractor={recipeKeyExtractor}
                renderItem={renderRecipeItem}
                numColumns={2}
                style={{ flex: 1 }}
                contentContainerStyle={styles.recipeListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.6}
                refreshControl={
                  <RefreshControl
                    refreshing={recipeRefreshing}
                    onRefresh={handleRefreshRecipes}
                    tintColor={tokens.color.primaryAccent.val}
                    colors={[tokens.color.primaryAccent.val]}
                    progressBackgroundColor={
                      isDarkMode
                        ? tokens.color.cardBgDark.val
                        : tokens.color.appBg.val
                    }
                  />
                }
                ListEmptyComponent={
                  recipesLoading ? (
                    <YStack paddingVertical={40} alignItems="center">
                      <ActivityIndicator
                        color={tokens.color.primaryAccent.val}
                      />
                    </YStack>
                  ) : (
                    <YStack paddingVertical={40} alignItems="center">
                      <Text
                        fontSize={14}
                        fontFamily="$body"
                        color={
                          isDarkMode
                            ? tokens.color.textDarkSub.val
                            : tokens.color.textLightSub.val
                        }
                      >
                        조건에 맞는 레시피가 없습니다.
                      </Text>
                    </YStack>
                  )
                }
                ListFooterComponent={
                  isFetchingNextPage ? (
                    <YStack paddingVertical={18} alignItems="center">
                      <ActivityIndicator
                        color={tokens.color.primaryAccent.val}
                      />
                    </YStack>
                  ) : (
                    <View style={{ height: 88 }} />
                  )
                }
              />
            </>
          )}
          {activeTab === "free" && (
            <FreePostTab
              tagFilter={freePostTagFilter}
              onTagFilterChange={setFreePostTagFilter}
            />
          )}
          <CategoryFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            selectedFilters={selectedFilters}
            onApply={setSelectedFilters}
          />
          <CuratedRecipeDetailSheet
            recipe={selectedRecipe ?? null}
            visible={selectedRecipeId !== null && selectedRecipe != null}
            onClose={() => setSelectedRecipeId(null)}
          />
          <WriteTypeSheet
            open={writeSheetOpen}
            onOpenChange={setWriteSheetOpen}
            onSelect={(type) => {
              setWriteSheetOpen(false)
              if (type === "free") {
                router.push("/free/new" as Href)
              } else {
                setRecipeModalOpen(true)
              }
            }}
          />
          <Modal
            visible={recipeModalOpen}
            animationType="slide"
            onRequestClose={() => setRecipeModalOpen(false)}
          >
            <RecipeEditor onClose={() => setRecipeModalOpen(false)} />
          </Modal>
          <Pressable
            onPress={() => setWriteSheetOpen(true)}
            style={({ pressed }) => ({
              ...styles.writeButton,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              color={isDarkMode ? "#1F1F21" : "#FCFCFC"}
              fontSize={16}
              lineHeight={28}
              fontWeight="600"
              fontFamily="$body"
            >
              + 글쓰기
            </Text>
          </Pressable>
        </YStack>
      </Pressable>
    </YStack>
  )
}

const styles = StyleSheet.create({
  writeButton: {
    position: "absolute",
    bottom: 26,
    right: 16,
    backgroundColor: tokens.color.primaryAccent.val,
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  recipeListContent: {
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 16,
  },
  recipeItem: {
    width: "50%",
    marginBottom: 12,
  },
  recipeItemLeft: {
    paddingLeft: 6,
    paddingRight: 6,
  },
  recipeItemRight: {
    paddingLeft: 6,
    paddingRight: 6,
  },
})

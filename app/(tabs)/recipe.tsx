import { useCallback, useMemo, useState } from "react"
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  useColorScheme,
  StyleSheet,
} from "react-native"
import { YStack, Text, XStack, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  TopTabBar,
  type TabItem,
} from "@/src/features/recipe/components/TabBar"
import { Icon } from "@/src/shared/components/Icon"
import { SearchInput } from "@/src/features/recipe/components/SearchInput"
import { FilterChip } from "@/src/features/recipe/components/FilterChip"
import { CategoryFilterSheet } from "@/src/features/recipe/components/CategoryFilterSheet"
import { FoodCategoryBar } from "@/src/features/recipe/components/FoodCategoryBar"
import { WriteTypeSheet } from "@/src/features/recipe/components/WriteTypeSheet"
import { RecipeCard } from "@/src/features/recipe/components/RecipeCard"
import { FreePostTab } from "@/src/features/recipe/components/FreePostTab"
import { FreePostEditor } from "@/src/features/recipe/components/FreePostEditor"
import { RecipeEditor } from "@/src/features/recipe/components/RecipeEditor"
import { useRecipePosts } from "@/src/features/recipe/hooks/useRecipePosts"
import type { RecipePostFilters } from "@/src/features/recipe/types"
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

function filtersToRecipeFilters(
  filters: Record<string, Set<string>>,
): RecipePostFilters {
  const result: RecipePostFilters = {}

  if (filters.nutrition?.size) {
    result.nutritionTags = [...filters.nutrition].map(
      (k) => CHIP_KEY_TO_LABEL.nutrition[k] ?? k,
    )
  }
  if (filters.stage?.size) {
    result.stageTags = [...filters.stage].map(
      (k) => CHIP_KEY_TO_LABEL.stage[k] ?? k,
    )
  }
  if (filters.country?.size) {
    result.cuisineTags = [...filters.country].map(
      (k) => CHIP_KEY_TO_LABEL.country[k] ?? k,
    )
  }

  return result
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
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [activeTab, setActiveTab] = useState("recipe")
  const iconColor = isDarkMode ? ICON_COLORS.dark : ICON_COLORS.light

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    Keyboard.dismiss()
  }

  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [writeSheetOpen, setWriteSheetOpen] = useState(false)
  const [freePostModalOpen, setFreePostModalOpen] = useState(false)
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({})

  // Convert UI filters to service filters
  const recipeFilters = useMemo(
    () => filtersToRecipeFilters(selectedFilters),
    [selectedFilters],
  )

  const { posts: recipes } = useRecipePosts(
    recipeFilters,
    search.trim() || undefined,
  )

  // FoodCategoryBar uses selectedFilters.country directly
  const selectedCategories = useMemo(() => {
    return selectedFilters.country ?? new Set<string>()
  }, [selectedFilters])

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

  const [leftColumn, rightColumn] = useMemo(() => {
    const left: typeof recipes = []
    const right: typeof recipes = []
    recipes.forEach((item, i) => {
      ;(i % 2 === 0 ? left : right).push(item)
    })
    return [left, right] as const
  }, [recipes])

  return (
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
              backgroundColor={isDarkMode ? tokens.color.cardBgDark.val : tokens.color.grey8.val}
            />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
            >
              <XStack gap={12}>
                <YStack flex={1} gap={12}>
                  {leftColumn.map((item) => (
                    <RecipeCard
                      key={item.id}
                      imageUri={item.imageUri ?? ""}
                      likeCount={item.likes}
                      commentCount={item.comments}
                      tags={{
                        nutrition: item.nutritionTags,
                        stage: item.stageTags,
                        country: item.cuisineTags,
                      }}
                      title={item.title}
                      onPress={() => console.log("RecipeCard pressed", item.id)}
                    />
                  ))}
                </YStack>
                <YStack flex={1} gap={12}>
                  {rightColumn.map((item) => (
                    <RecipeCard
                      key={item.id}
                      imageUri={item.imageUri ?? ""}
                      likeCount={item.likes}
                      commentCount={item.comments}
                      tags={{
                        nutrition: item.nutritionTags,
                        stage: item.stageTags,
                        country: item.cuisineTags,
                      }}
                      title={item.title}
                      onPress={() => console.log("RecipeCard pressed", item.id)}
                    />
                  ))}
                </YStack>
              </XStack>
            </ScrollView>
          </>
        )}
        {activeTab === "free" && <FreePostTab />}
        <CategoryFilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          selectedFilters={selectedFilters}
          onApply={setSelectedFilters}
        />
        <WriteTypeSheet
          open={writeSheetOpen}
          onOpenChange={setWriteSheetOpen}
          onSelect={(type) => {
            if (type === "free") {
              setFreePostModalOpen(true)
            } else {
              setRecipeModalOpen(true)
            }
          }}
        />
        <Modal
          visible={freePostModalOpen}
          animationType="slide"
          onRequestClose={() => setFreePostModalOpen(false)}
        >
          <FreePostEditor onClose={() => setFreePostModalOpen(false)} />
        </Modal>
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
})

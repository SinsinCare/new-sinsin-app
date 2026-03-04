import { useCallback, useMemo, useState } from "react"
import { useRouter } from "expo-router"
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
import {
  RecipeCard,
  type RecipeCardTags,
} from "@/src/features/recipe/components/RecipeCard"
import { FreePostTab } from "@/src/features/recipe/components/FreePostTab"
import { FreePostEditor } from "@/src/features/recipe/components/FreePostEditor"

interface RecipeItem {
  id: string
  imageUri: string
  likeCount: number
  commentCount: number
  tags: RecipeCardTags
  title: string
}

const MOCK_RECIPES: RecipeItem[] = [
  {
    id: "1",
    imageUri:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    likeCount: 32,
    commentCount: 24,
    tags: { nutrition: ["저염식"], stage: ["CKD3"], country: ["일식"] },
    title: "닭가슴살 카레",
  },
  {
    id: "2",
    imageUri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    likeCount: 32,
    commentCount: 24,
    tags: { nutrition: ["저염식"], stage: ["CKD3"], country: ["일식"] },
    title: "닭가슴살 카레",
  },
  {
    id: "3",
    imageUri:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    likeCount: 32,
    commentCount: 24,
    tags: { nutrition: ["저염식"], stage: ["CKD3"], country: ["일식"] },
    title: "닭가슴살 카레",
  },
  {
    id: "4",
    imageUri:
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
    likeCount: 32,
    commentCount: 24,
    tags: { nutrition: ["저염식"], stage: ["CKD3"], country: ["일식"] },
    title: "닭가슴살 카레",
  },
]

const RECIPE_TABS: TabItem[] = [
  { key: "recipe", label: "레시피" },
  { key: "free", label: "자유글" },
]

const FILTER_CHIPS = [
  { key: "low-salt", label: "#저염식", theme: "primary" as const },
  { key: "ckd3", label: "#CKD3", theme: "sub" as const },
  { key: "japanese", label: "#일식", theme: "tertiary" as const },
  { key: "low-protein", label: "#저단백" },
  { key: "low-potassium", label: "#저칼륨" },
]

const HEADER_BOOKMARK_COLORS = {
  light: "#3C3C43",
  dark: "#E7E7EE",
} as const

const ICON_COLORS = {
  light: "#8E8E93",
  dark: "#66666B",
} as const

export default function RecipeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [activeTab, setActiveTab] = useState("recipe")
  const headerColor = isDarkMode
    ? HEADER_BOOKMARK_COLORS.dark
    : HEADER_BOOKMARK_COLORS.light
  const iconColor = isDarkMode ? ICON_COLORS.dark : ICON_COLORS.light

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    Keyboard.dismiss()
  }

  const [search, setSearch] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [writeSheetOpen, setWriteSheetOpen] = useState(false)
  const [freePostModalOpen, setFreePostModalOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({})

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  )

  const handleToggleCategory = useCallback((key: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleToggleAllCategories = useCallback((isSelected: boolean) => {
    setSelectedCategories(isSelected ? new Set() : new Set())
  }, [])

  const [leftColumn, rightColumn] = useMemo(() => {
    const left: RecipeItem[] = []
    const right: RecipeItem[] = []
    MOCK_RECIPES.forEach((item, i) => {
      ;(i % 2 === 0 ? left : right).push(item)
    })
    return [left, right] as const
  }, [])

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
          rightAction={
            <Pressable hitSlop={8} onPress={() => {}}>
              <Icon name="bookmark" size={24} color={headerColor} />
            </Pressable>
          }
        />
        {activeTab === "recipe" && (
          <>
            <YStack paddingHorizontal={16} paddingVertical={14} gap={16}>
              <SearchInput value={search} onChangeText={setSearch} />
              <XStack alignItems="center" gap={12}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  style={{ flex: 1 }}
                >
                  {Object.values(FILTER_CHIPS).map((chip) => (
                    <FilterChip
                      key={chip.key}
                      label={chip.label}
                      theme="default"
                    />
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setFilterSheetOpen(true)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Icon name="filter" size={24} color={iconColor} />
                </Pressable>
              </XStack>
              <FoodCategoryBar
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
                onToggleAllCategories={handleToggleAllCategories}
              />
            </YStack>
            <View
              height={6}
              backgroundColor={isDarkMode ? "#313138" : "#E7E7EE"}
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
                      imageUri={item.imageUri}
                      likeCount={item.likeCount}
                      commentCount={item.commentCount}
                      tags={item.tags}
                      title={item.title}
                      onPress={() => console.log("RecipeCard pressed", item.id)}
                    />
                  ))}
                </YStack>
                <YStack flex={1} gap={12}>
                  {rightColumn.map((item) => (
                    <RecipeCard
                      key={item.id}
                      imageUri={item.imageUri}
                      likeCount={item.likeCount}
                      commentCount={item.commentCount}
                      tags={item.tags}
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
              router.push(`/(write)/${type}/new`)
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
    backgroundColor: "#FF7246",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
})

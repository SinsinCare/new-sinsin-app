import { useState } from "react"
import { Keyboard, Pressable, ScrollView, useColorScheme } from "react-native"
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
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({})

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <YStack
        flex={1}
        backgroundColor={isDarkMode ? "#1F1F21" : "#F3F3F3"}
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
                      theme={"theme" in chip ? chip.theme : undefined}
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
            </YStack>
            <View
              height={6}
              backgroundColor={isDarkMode ? "#313138" : "#D4D4D4"}
            />
          </>
        )}
        {activeTab === "free" && (
          <YStack paddingHorizontal={16} paddingVertical={14}>
            <Text color={headerColor} fontSize="$5">
              자유글 컨텐츠
            </Text>
          </YStack>
        )}
        <CategoryFilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          selectedFilters={selectedFilters}
          onApply={setSelectedFilters}
        />
      </YStack>
    </Pressable>
  )
}

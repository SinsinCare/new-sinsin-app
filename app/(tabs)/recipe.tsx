import { useState } from "react"
import { Keyboard, Pressable, useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  TopTabBar,
  type TabItem,
} from "@/src/features/recipe/components/TabBar"
import { Icon } from "@/src/shared/components/Icon"
import { SearchInput } from "@/src/features/recipe/components/SearchInput"
import { FilterChipRow } from "@/src/features/recipe/components/FilterChipRow"

const RECIPE_TABS: TabItem[] = [
  { key: "recipe", label: "레시피" },
  { key: "free", label: "자유글" },
]

const FILTER_CHIPS = [
  { key: "low-salt", label: "#저염식" },
  { key: "ckd3", label: "#CKD3" },
  { key: "japanese", label: "#일식" },
  { key: "low-protein", label: "#저단백" },
  { key: "low-potassium", label: "#저칼륨" },
]

export default function RecipeScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [activeTab, setActiveTab] = useState("recipe")
  const headerColor = isDarkMode ? "#E7E7EE" : "#2A2A37"

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    Keyboard.dismiss()
  }

  const [search, setSearch] = useState("")
  const [selectedChips, setSelectedChips] = useState<string[]>([])

  const handleChipPress = (key: string) => {
    setSelectedChips((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

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
          <YStack paddingHorizontal={16} paddingVertical={14} gap={16}>
            <SearchInput value={search} onChangeText={setSearch} />
            <FilterChipRow
              chips={FILTER_CHIPS}
              selectedChips={selectedChips}
              onChipPress={handleChipPress}
              onFilterPress={() => {}}
            />
          </YStack>
        )}
        {activeTab === "free" && (
          <YStack paddingHorizontal={16} paddingVertical={14}>
            <Text color={headerColor} fontSize="$5">
              자유글 컨텐츠
            </Text>
          </YStack>
        )}
      </YStack>
    </Pressable>
  )
}

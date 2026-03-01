import { useState } from "react"
import { Pressable, useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  TopTabBar,
  type TabItem,
} from "@/src/features/recipe/components/TabBar"
import { Icon } from "@/src/shared/components/Icon"

const RECIPE_TABS: TabItem[] = [
  { key: "recipe", label: "레시피" },
  { key: "free", label: "자유글" },
]

export default function RecipeScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [activeTab, setActiveTab] = useState("recipe")
  const headerColor = isDarkMode ? "#E7E7EE" : "#2A2A37"

  return (
    <YStack
      flex={1}
      backgroundColor={isDarkMode ? "#1F1F21" : "#F3F3F3"}
      paddingTop={insets.top}
    >
      <TopTabBar
        tabs={RECIPE_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightAction={
          <Pressable hitSlop={8} onPress={() => {}}>
            <Icon name="bookmark" size={24} color={headerColor} />
          </Pressable>
        }
      />

      {/* Tab content placeholder */}
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color={headerColor} fontSize="$5">
          {activeTab === "recipe" ? "레시피 컨텐츠" : "자유글 컨텐츠"}
        </Text>
      </YStack>
    </YStack>
  )
}

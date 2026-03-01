import { useState } from "react"
import { useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  RecipeTopTabBar,
  type RecipeTab,
} from "@/src/features/recipe/components/RecipeTopTabBar"

export default function RecipeScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [activeTab, setActiveTab] = useState<RecipeTab>("recipe")

  const handleBookmarkPress = () => {
    // TODO: navigate to bookmarks
  }

  return (
    <YStack
      flex={1}
      backgroundColor={isDarkMode ? "#1F1F21" : "#F3F3F3"}
      paddingTop={insets.top}
    >
      <RecipeTopTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBookmarkPress={handleBookmarkPress}
      />

      {/* Tab content placeholder */}
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color={isDarkMode ? "#E7E7EE" : "#2A2A37"} fontSize="$5">
          {activeTab === "recipe" ? "레시피 컨텐츠" : "자유글 컨텐츠"}
        </Text>
      </YStack>
    </YStack>
  )
}

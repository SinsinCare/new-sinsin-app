import { useState, useCallback } from "react"
import { ScrollView, Pressable, StyleSheet } from "react-native"
import { YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"
import { KidneyRecommendedFood } from "@/src/features/recipe/types"
import { useKidneyRecommendations } from "@/src/features/recipe/hooks/useKidneyRecommendations"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { RecipeHeader } from "@/src/features/recipe/components/RecipeHeader"
import { KidneyNutritionSection } from "@/src/features/recipe/components/KidneyNutritionSection"
import { LowPhosphorusSection } from "@/src/features/recipe/components/LowPhosphorusSection"
import { CommunitySection } from "@/src/features/recipe/components/CommunitySection"
import { FoodDetailSheet } from "@/src/features/recipe/components/FoodDetailSheet"

export default function RecipeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAllFoods, setShowAllFoods] = useState(false)
  const [selectedFood, setSelectedFood] =
    useState<KidneyRecommendedFood | null>(null)

  const { recommendations } = useKidneyRecommendations(searchQuery)
  const { posts, isLoading, toggleLike, toggleBookmark } = useCommunityPosts()

  const handleFoodPress = useCallback((item: KidneyRecommendedFood) => {
    setSelectedFood(item)
  }, [])

  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`)
    },
    [router],
  )

  return (
    <YStack flex={1} backgroundColor="#f8f9fa" paddingTop={insets.top}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack paddingTop="$3" gap="$4">
          <RecipeHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {showAllFoods ? (
            <LowPhosphorusSection
              recommendations={recommendations}
              onFoodPress={handleFoodPress}
              onClose={() => setShowAllFoods(false)}
            />
          ) : (
            <KidneyNutritionSection
              recommendations={recommendations}
              onFoodPress={handleFoodPress}
              onViewAll={() => setShowAllFoods(true)}
            />
          )}

          <CommunitySection
            posts={posts}
            isLoading={isLoading}
            onPostPress={handlePostPress}
            onLike={toggleLike}
            onBookmark={toggleBookmark}
          />
        </YStack>
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push("/create-post")}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      <FoodDetailSheet
        item={selectedFood}
        open={selectedFood !== null}
        onClose={() => setSelectedFood(null)}
      />
    </YStack>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.color.sub7.val,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
})

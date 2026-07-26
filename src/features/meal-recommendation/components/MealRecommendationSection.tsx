import { useState, useCallback } from "react"
import { ScrollView, Pressable, ActivityIndicator } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import { useMealRecommendations } from "../hooks/useMealRecommendations"
import { MealTypeToggle } from "./MealTypeToggle"
import { NutrientBudgetBar } from "./NutrientBudgetBar"
import { AiRecommendationSummary } from "./AiRecommendationSummary"
import { RecommendedRecipeCard } from "./RecommendedRecipeCard"
import { RecommendedRestaurantCard } from "./RecommendedRestaurantCard"
import type { MealType, RecommendationCategory } from "../types"

interface MealRecommendationSectionProps {
  /** Which type of recommendations to show */
  category?: RecommendationCategory
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours()
  return hour < 14 ? "LUNCH" : "DINNER"
}

export function MealRecommendationSection({
  category = "all",
}: MealRecommendationSectionProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType)

  const {
    recommendations,
    isLoading,
    refresh,
    isRefreshing,
    dismiss,
    toggleBookmark,
  } = useMealRecommendations(mealType, category)

  const textColor = isDark
    ? tokens.color.textDark.val
    : tokens.color.textLight.val
  const subColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey5.val

  const handleDismissRecipe = useCallback(
    (id: number) => dismiss({ itemType: "RECIPE", itemId: id }),
    [dismiss],
  )
  const handleDismissMenu = useCallback(
    (id: number) => dismiss({ itemType: "RESTAURANT_MENU", itemId: id }),
    [dismiss],
  )
  const handleBookmarkRecipe = useCallback(
    (id: number) => toggleBookmark({ itemType: "RECIPE", itemId: id }),
    [toggleBookmark],
  )
  const handleBookmarkMenu = useCallback(
    (id: number) => toggleBookmark({ itemType: "RESTAURANT_MENU", itemId: id }),
    [toggleBookmark],
  )

  const mealLabel = mealType === "LUNCH" ? "점심" : "저녁"
  const hasRecipes = (recommendations?.recipes.length ?? 0) > 0
  const hasMenus = (recommendations?.restaurantMenus.length ?? 0) > 0
  const isEmpty = !isLoading && !hasRecipes && !hasMenus

  return (
    <GlassmorphicCard variant="elevated" gap={14}>
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap={8} alignItems="center">
          <Ionicons
            name="sparkles"
            size={18}
            color={tokens.color.primaryAccent.val}
          />
          <Text
            fontSize={16}
            fontFamily="$body"
            fontWeight="700"
            color={textColor}
          >
            오늘의 {mealLabel} 추천
          </Text>
        </XStack>
        <XStack gap={8} alignItems="center">
          <MealTypeToggle value={mealType} onChange={setMealType} />
          <Pressable onPress={() => refresh()} hitSlop={8} disabled={isRefreshing}>
            <Ionicons
              name="refresh"
              size={18}
              color={isRefreshing ? subColor : tokens.color.primaryAccent.val}
            />
          </Pressable>
        </XStack>
      </XStack>

      {/* Loading */}
      {isLoading && (
        <YStack alignItems="center" paddingVertical={20}>
          <ActivityIndicator
            color={tokens.color.primaryAccent.val}
            size="small"
          />
          <Text
            fontSize={13}
            fontFamily="$body"
            color={subColor}
            marginTop={8}
          >
            추천을 생성하고 있어요...
          </Text>
        </YStack>
      )}

      {/* Content */}
      {recommendations && (
        <>
          {/* Nutrient Budget */}
          <NutrientBudgetBar budget={recommendations.nutrientBudget} />

          {/* AI Summary */}
          {recommendations.aiSummary && (
            <AiRecommendationSummary summary={recommendations.aiSummary} />
          )}

          {/* Recipe Cards */}
          {hasRecipes && (category === "recipe" || category === "all") && (
            <YStack gap={8}>
              <Text
                fontSize={13}
                fontFamily="$body"
                fontWeight="600"
                color={subColor}
              >
                집밥 레시피
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {recommendations.recipes.map((recipe) => (
                  <RecommendedRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onDismiss={() => handleDismissRecipe(recipe.id)}
                    onBookmark={() => handleBookmarkRecipe(recipe.id)}
                  />
                ))}
              </ScrollView>
            </YStack>
          )}

          {/* Restaurant Menu Cards */}
          {hasMenus && (category === "restaurant" || category === "all") && (
            <YStack gap={8}>
              <Text
                fontSize={13}
                fontFamily="$body"
                fontWeight="600"
                color={subColor}
              >
                외식 메뉴
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {recommendations.restaurantMenus.map((menu) => (
                  <RecommendedRestaurantCard
                    key={menu.menuId}
                    menu={menu}
                    onDismiss={() => handleDismissMenu(menu.menuId)}
                    onBookmark={() => handleBookmarkMenu(menu.menuId)}
                  />
                ))}
              </ScrollView>
            </YStack>
          )}

          {/* Empty state */}
          {isEmpty && (
            <YStack alignItems="center" paddingVertical={16}>
              <Ionicons name="leaf-outline" size={32} color={subColor} />
              <Text
                fontSize={13}
                fontFamily="$body"
                color={subColor}
                marginTop={8}
                textAlign="center"
              >
                오늘의 영양소 예산에 맞는 추천 메뉴가 없어요.{"\n"}
                영양소 한도를 확인해보세요.
              </Text>
            </YStack>
          )}
        </>
      )}
    </GlassmorphicCard>
  )
}

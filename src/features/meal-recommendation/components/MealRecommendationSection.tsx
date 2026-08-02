import { useState, useCallback } from "react"
import { ScrollView, Pressable, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import { V2Skeleton, V2SkeletonGroup } from "@/src/design-system-v2"
import { useMealRecommendations } from "../hooks/useMealRecommendations"
import { MealTypeToggle } from "./MealTypeToggle"
import { NutrientBudgetBar } from "./NutrientBudgetBar"
import { AiRecommendationSummary } from "./AiRecommendationSummary"
import { RecommendedRecipeCard } from "./RecommendedRecipeCard"
import { RecommendedRestaurantCard } from "./RecommendedRestaurantCard"
import type { MealType, RecommendationCategory } from "../types"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
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

  const mealLabel = mealType === "LUNCH" ? t("meal.LUNCH") : t("meal.DINNER")
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
            {t("mealRecommendation.title", { meal: mealLabel })}
          </Text>
        </XStack>
        <XStack gap={8} alignItems="center">
          <MealTypeToggle value={mealType} onChange={setMealType} />
          <Pressable
            onPress={() => refresh()}
            hitSlop={8}
            disabled={isRefreshing}
            accessibilityRole="button"
            accessibilityLabel={t("mealRecommendation.refresh")}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={isRefreshing ? subColor : tokens.color.primaryAccent.val}
            />
          </Pressable>
        </XStack>
      </XStack>

      {/* Loading — 영양 예산 막대 + 카드 두 장이 오는 자리를 미리 잡는다.
          가운데 링 하나로 기다리면 도착 순간 섹션 높이가 두 배로 늘어난다. */}
      {isLoading && (
        <V2SkeletonGroup>
          <YStack gap={12}>
            <V2Skeleton height={4} radius="full" />
            <V2Skeleton height={56} radius="lg" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[0, 1].map((index) => (
                <V2Skeleton key={index} width={200} height={124} radius="2xl" />
              ))}
            </View>
          </YStack>
        </V2SkeletonGroup>
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
                {t("mealRecommendation.recipes")}
              </Text>
              <ScrollView
                bounces={false}
                overScrollMode="never"
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
                {t("mealRecommendation.restaurantMenus")}
              </Text>
              <ScrollView
                bounces={false}
                overScrollMode="never"
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
                {t("mealRecommendation.empty")}
              </Text>
            </YStack>
          )}
        </>
      )}
    </GlassmorphicCard>
  )
}

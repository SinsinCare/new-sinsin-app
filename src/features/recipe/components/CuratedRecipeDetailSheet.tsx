import { useEffect, useState } from "react"
import { Pressable } from "react-native"
import { Image } from "expo-image"
import { YStack, XStack, Text, View } from "tamagui"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import {
  AppBottomSheet,
  AppBottomSheetScrollView,
} from "@/src/shared/components"
import type { CuratedRecipe } from "../data/curatedRecipeTypes"
import { useTranslation } from "react-i18next"
import { normalizeLanguage } from "@/src/i18n"
import { useRecipeDetail } from "../hooks/useRecipeDetail"
import { getCuratedRecipeContentPresentation } from "../utils/curatedRecipePresentation"

const CATEGORY_KEYS = {
  한식: "category.food.korean",
  korean: "category.food.korean",
  중식: "category.food.chinese",
  chinese: "category.food.chinese",
  일식: "category.food.japanese",
  japanese: "category.food.japanese",
  양식: "category.food.western",
  western: "category.food.western",
  샐러드: "category.food.salad",
  salad: "category.food.salad",
  디저트: "category.food.dessert",
  dessert: "category.food.dessert",
  음료: "category.food.beverage",
  beverage: "category.food.beverage",
  drink: "category.food.drink",
} as const

const COLORS = {
  light: {
    bg: "#FFFFFF",
    overlay: "rgba(0,0,0,0.45)",
    title: tokens.color.textLight.val,
    sub: "#8E8E93",
    sectionTitle: tokens.color.textLight.val,
    label: "#636366",
    value: tokens.color.textLight.val,
    aiBoxBg: "#F2F2F7",
    divider: "#E5E5EA",
    badgeBg: "#F2F2F7",
    badgeText: "#636366",
    categoryBg: "#EEF7F4",
    categoryText: tokens.color.sub8.val,
    nutritionBg: "#F9F9FB",
    nutritionBorder: "#E5E5EA",
  },
  dark: {
    bg: tokens.color.cardBgDark.val,
    overlay: "rgba(0,0,0,0.65)",
    title: tokens.color.textDark.val,
    sub: tokens.color.textDarkSub.val,
    sectionTitle: tokens.color.textDark.val,
    label: tokens.color.textDarkSub.val,
    value: tokens.color.textDark.val,
    aiBoxBg: "#26262D",
    divider: "#3A3A42",
    badgeBg: "#3A3A42",
    badgeText: tokens.color.textDarkSub.val,
    categoryBg: "#1B3830",
    categoryText: tokens.color.sub6.val,
    nutritionBg: "#26262D",
    nutritionBorder: "#3A3A42",
  },
} as const

const RECIPE_DETAIL_SNAP_POINTS = [58, 88]

interface CuratedRecipeDetailSheetProps {
  recipe: CuratedRecipe | null
  visible: boolean
  onClose: () => void
}

function NutrientBox({
  label,
  value,
  palette,
}: {
  label: string
  value: string
  palette: (typeof COLORS)["light" | "dark"]
}) {
  return (
    <YStack
      flex={1}
      backgroundColor={palette.nutritionBg}
      borderRadius={10}
      padding={10}
      gap={4}
      borderWidth={1}
      borderColor={palette.nutritionBorder}
      alignItems="center"
    >
      <Text fontSize={12} fontFamily="$body" color={palette.label}>
        {label}
      </Text>
      <Text
        fontSize={15}
        fontWeight="700"
        fontFamily="$body"
        color={palette.value}
      >
        {value}
      </Text>
    </YStack>
  )
}

export function CuratedRecipeDetailSheet({
  recipe,
  visible,
  onClose,
}: CuratedRecipeDetailSheetProps) {
  const { t, i18n } = useTranslation("recipe")
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [showOriginal, setShowOriginal] = useState(false)
  const contentPresentation = getCuratedRecipeContentPresentation(
    recipe,
    language,
  )
  const { isEnglishCatalog, hasEnglishContentGap } = contentPresentation
  const originalRecipeQuery = useRecipeDetail(
    isEnglishCatalog && showOriginal ? (recipe?.id ?? null) : null,
    "ko",
  )

  useEffect(() => {
    setShowOriginal(false)
  }, [language, recipe?.id])

  if (!recipe) return null

  const image = recipe.detail_image_url ?? recipe.thumbnail_url
  const categoryKey =
    CATEGORY_KEYS[
      recipe.category.toLowerCase() as keyof typeof CATEGORY_KEYS
    ] ?? CATEGORY_KEYS[recipe.category as keyof typeof CATEGORY_KEYS]
  const categoryLabel = categoryKey ? t(categoryKey) : recipe.category
  const localeTag = language === "en" ? "en-US" : "ko-KR"
  const originalRecipe = originalRecipeQuery.data
  const visibleIngredients =
    showOriginal && originalRecipe
      ? originalRecipe.ingredients
      : recipe.ingredients
  const visibleSteps =
    showOriginal && originalRecipe ? originalRecipe.steps : recipe.steps
  const formatNutrition = (value: number, unit: string) =>
    `${value.toLocaleString(localeTag)} ${unit}`

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={RECIPE_DETAIL_SNAP_POINTS}
      initialSnapIndex={0}
      contentBottomPadding={false}
      dragHandleOnly
    >
      <YStack flex={1} backgroundColor={palette.bg}>
        {/* Header */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={12}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <YStack flex={1} gap={6} paddingRight={12}>
            <Text
              fontSize={20}
              fontWeight="700"
              fontFamily="$body"
              color={palette.title}
              lineHeight={28}
            >
              {recipe.name}
            </Text>
            <XStack gap={8} alignItems="center" flexWrap="wrap">
              <XStack
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={8}
                backgroundColor={palette.categoryBg}
              >
                <Text
                  fontSize={12}
                  fontWeight="600"
                  fontFamily="$body"
                  color={palette.categoryText}
                >
                  {categoryLabel}
                </Text>
              </XStack>
              {recipe.time_min > 0 && (
                <Text
                  fontSize={12}
                  fontFamily="$body"
                  color={palette.sub}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.minutes", { count: recipe.time_min })}
                </Text>
              )}
              {recipe.difficulty && (
                <Text fontSize={12} fontFamily="$body" color={palette.sub}>
                  · {recipe.difficulty}
                </Text>
              )}
              {recipe.servings > 0 && (
                <Text
                  fontSize={12}
                  fontFamily="$body"
                  color={palette.sub}
                  lineBreakStrategyIOS="hangul-word"
                >
                  · {t("curated.servings", { count: recipe.servings })}
                </Text>
              )}
            </XStack>
          </YStack>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor={palette.badgeBg}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={16} fontFamily="$body" color={palette.label}>
                ✕
              </Text>
            </View>
          </Pressable>
        </XStack>

        <View
          height={1}
          backgroundColor={palette.divider}
          marginHorizontal={20}
        />

        <AppBottomSheetScrollView
          contentContainerStyle={{ padding: 20, gap: 20 }}
        >
          {/* Recipe image */}
          {image && (
            <View
              borderRadius={12}
              overflow="hidden"
              backgroundColor={palette.badgeBg}
              style={{ aspectRatio: 1, width: "100%" }}
            >
              <Image
                source={typeof image === "string" ? { uri: image } : image}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          )}

          {recipe.description && (
            <Text
              fontSize={15}
              fontFamily="$body"
              color={palette.value}
              lineHeight={23}
            >
              {recipe.description}
            </Text>
          )}

          {hasEnglishContentGap && (
            <YStack
              borderWidth={1}
              borderColor={palette.nutritionBorder}
              backgroundColor={palette.nutritionBg}
              borderRadius={12}
              padding={14}
              gap={10}
            >
              <YStack gap={4}>
                <Text
                  fontSize={15}
                  fontWeight="700"
                  fontFamily="$body"
                  color={palette.sectionTitle}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.englishContentGapTitle")}
                </Text>
                <Text
                  fontSize={14}
                  fontFamily="$body"
                  color={palette.sub}
                  lineHeight={20}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.englishContentGapBody")}
                </Text>
              </YStack>

              <XStack gap={8} flexWrap="wrap">
                <Text
                  fontSize={13}
                  fontFamily="$body"
                  color={palette.sub}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.ingredientCount", {
                    count: contentPresentation.ingredientCount,
                  })}
                </Text>
                <Text fontSize={13} fontFamily="$body" color={palette.sub}>
                  ·
                </Text>
                <Text
                  fontSize={13}
                  fontFamily="$body"
                  color={palette.sub}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.stepCount", {
                    count: contentPresentation.stepCount,
                  })}
                </Text>
              </XStack>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  showOriginal
                    ? "curated.hideOriginal"
                    : "curated.showOriginal",
                )}
                onPress={() => setShowOriginal((current) => !current)}
                style={({ pressed }) => ({
                  alignSelf: "flex-start",
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Text
                  fontSize={14}
                  fontWeight="700"
                  fontFamily="$body"
                  color={palette.categoryText}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t(
                    showOriginal
                      ? "curated.hideOriginal"
                      : "curated.showOriginal",
                  )}
                </Text>
              </Pressable>

              {showOriginal && originalRecipeQuery.isLoading && (
                <Text
                  fontSize={13}
                  fontFamily="$body"
                  color={palette.sub}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.loadingOriginal")}
                </Text>
              )}
              {showOriginal && originalRecipeQuery.isError && (
                <YStack gap={6}>
                  <Text
                    fontSize={13}
                    fontFamily="$body"
                    color={palette.sub}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {t("curated.originalLoadError")}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("curated.retryOriginal")}
                    onPress={() => void originalRecipeQuery.refetch()}
                  >
                    <Text
                      fontSize={13}
                      fontWeight="700"
                      fontFamily="$body"
                      color={palette.categoryText}
                      lineBreakStrategyIOS="hangul-word"
                    >
                      {t("curated.retryOriginal")}
                    </Text>
                  </Pressable>
                </YStack>
              )}
              {showOriginal && originalRecipe && (
                <Text
                  fontSize={12}
                  fontWeight="600"
                  fontFamily="$body"
                  color={palette.sub}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("curated.originalKoreanLabel")}
                </Text>
              )}
            </YStack>
          )}

          {/* 임상 검수 전에는 AI 요약과 단계별 섭취 허용 문구를 노출하지 않는다. */}
          <YStack
            backgroundColor={palette.aiBoxBg}
            borderRadius={12}
            padding={14}
            gap={4}
          >
            <Text
              fontSize={12}
              fontWeight="600"
              fontFamily="$body"
              color={palette.categoryText}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("curated.estimateTitle")}
            </Text>
            <Text
              fontSize={14}
              fontFamily="$body"
              color={palette.sub}
              lineHeight={20}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("curated.estimateBody")}
            </Text>
          </YStack>

          {/* 영양정보 */}
          <YStack gap={10}>
            <Text
              fontSize={16}
              fontWeight="700"
              fontFamily="$body"
              color={palette.sectionTitle}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("curated.nutritionTitle")}
            </Text>
            <XStack gap={8}>
              <NutrientBox
                label={t("curated.sodium")}
                value={formatNutrition(recipe.nutrition.sodium_mg, "mg")}
                palette={palette}
              />
              <NutrientBox
                label={t("curated.potassium")}
                value={formatNutrition(recipe.nutrition.potassium_mg, "mg")}
                palette={palette}
              />
              <NutrientBox
                label={t("curated.phosphorus")}
                value={formatNutrition(recipe.nutrition.phosphorus_mg, "mg")}
                palette={palette}
              />
            </XStack>
            <XStack gap={8}>
              <NutrientBox
                label={t("curated.protein")}
                value={formatNutrition(recipe.nutrition.protein_g, "g")}
                palette={palette}
              />
              <NutrientBox
                label={t("curated.calories")}
                value={formatNutrition(recipe.nutrition.kcal, "kcal")}
                palette={palette}
              />
              <YStack flex={1} />
            </XStack>
          </YStack>

          {/* 재료 */}
          {visibleIngredients.length > 0 && (
            <YStack gap={10}>
              <Text
                fontSize={16}
                fontWeight="700"
                fontFamily="$body"
                color={palette.sectionTitle}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("curated.ingredients", { count: recipe.servings })}
              </Text>
              <YStack gap={6}>
                {visibleIngredients.map((ing, idx) => (
                  <XStack
                    key={idx}
                    justifyContent="space-between"
                    paddingVertical={6}
                    borderBottomWidth={
                      idx < visibleIngredients.length - 1 ? 1 : 0
                    }
                    borderBottomColor={palette.divider}
                  >
                    <Text
                      fontSize={14}
                      fontFamily="$body"
                      color={palette.value}
                    >
                      {ing.name}
                    </Text>
                    <Text fontSize={14} fontFamily="$body" color={palette.sub}>
                      {ing.amount}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* 조리 순서 */}
          {visibleSteps.length > 0 && (
            <YStack gap={10}>
              <Text
                fontSize={16}
                fontWeight="700"
                fontFamily="$body"
                color={palette.sectionTitle}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("curated.steps")}
              </Text>
              <YStack gap={12}>
                {visibleSteps.map((step) => (
                  <XStack key={step.order} gap={12} alignItems="flex-start">
                    <YStack
                      width={28}
                      height={28}
                      borderRadius={14}
                      backgroundColor={palette.categoryBg}
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text
                        fontSize={13}
                        fontWeight="700"
                        fontFamily="$body"
                        color={palette.categoryText}
                      >
                        {step.order}
                      </Text>
                    </YStack>
                    <Text
                      fontSize={14}
                      fontFamily="$body"
                      color={palette.value}
                      flex={1}
                      lineHeight={22}
                      paddingTop={3}
                    >
                      {step.content}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* Bottom spacer */}
          <YStack height={8} />
        </AppBottomSheetScrollView>
      </YStack>
    </AppBottomSheet>
  )
}

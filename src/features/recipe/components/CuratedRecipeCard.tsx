import { memo } from "react"
import { Pressable } from "react-native"
import { Image } from "expo-image"
import { YStack, XStack, Text, View } from "tamagui"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import type { CuratedRecipe } from "../data/curatedRecipeTypes"
import { useTranslation } from "react-i18next"

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

const DIFFICULTY_KEYS = {
  쉬움: "curated.difficulty.easy",
  easy: "curated.difficulty.easy",
  보통: "curated.difficulty.medium",
  medium: "curated.difficulty.medium",
  어려움: "curated.difficulty.hard",
  hard: "curated.difficulty.hard",
} as const

const COLORS = {
  light: {
    bg: "#FFFFFF",
    title: tokens.color.textLight.val,
    sub: "#8E8E93",
    tagBg: "#F2F2F7",
    tagText: "#636366",
    border: "#E5E5EA",
    accent: tokens.color.primary1.val,
  },
  dark: {
    bg: tokens.color.cardBgDark.val,
    title: tokens.color.textDark.val,
    sub: tokens.color.textDarkSub.val,
    tagBg: "#3A3A42",
    tagText: tokens.color.textDarkSub.val,
    border: "#3A3A42",
    accent: "#3B2B28",
  },
} as const

interface CuratedRecipeCardProps {
  recipe: CuratedRecipe
  onPress?: () => void
}

export const CuratedRecipeCard = memo(function CuratedRecipeCard({
  recipe,
  onPress,
}: CuratedRecipeCardProps) {
  const { t } = useTranslation("recipe")
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  const categoryKey =
    CATEGORY_KEYS[
      recipe.category.toLowerCase() as keyof typeof CATEGORY_KEYS
    ] ?? CATEGORY_KEYS[recipe.category as keyof typeof CATEGORY_KEYS]
  const difficultyKey =
    DIFFICULTY_KEYS[
      recipe.difficulty.toLowerCase() as keyof typeof DIFFICULTY_KEYS
    ] ?? DIFFICULTY_KEYS[recipe.difficulty as keyof typeof DIFFICULTY_KEYS]
  const categoryLabel = categoryKey ? t(categoryKey) : recipe.category
  const difficultyLabel = difficultyKey ? t(difficultyKey) : recipe.difficulty
  const timeLabel = t("curated.minutes", { count: recipe.time_min })

  const image = recipe.thumbnail_url

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <YStack
        backgroundColor={palette.bg}
        borderRadius={12}
        padding={image ? 12 : 14}
        gap={image ? 8 : 10}
        borderWidth={1}
        borderColor={palette.border}
        minHeight={image ? undefined : 178}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        {/* Recipe image */}
        {image && (
          <View
            borderRadius={8}
            overflow="hidden"
            backgroundColor={palette.tagBg}
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
        {!image && (
          <View
            height={4}
            width={42}
            borderRadius={999}
            backgroundColor={palette.accent}
          />
        )}

        {/* Meta: category · difficulty · time */}
        <Text
          fontSize={12}
          fontFamily="$body"
          color={palette.sub}
          numberOfLines={1}
        >
          {categoryLabel} · {difficultyLabel} · {timeLabel}
        </Text>

        {/* Title */}
        <Text
          fontSize={15}
          fontWeight="600"
          fontFamily="$body"
          color={palette.title}
          numberOfLines={2}
          lineHeight={22}
        >
          {recipe.name}
        </Text>

        {/* Description */}
        <Text
          fontSize={13}
          fontFamily="$body"
          color={palette.sub}
          numberOfLines={1}
        >
          {recipe.description}
        </Text>

        {/* 영양·CKD 적합성은 임상 검수 전이므로 중립 상태만 보여 준다. */}
        <XStack>
          <XStack
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={8}
            backgroundColor={palette.tagBg}
          >
            <Text
              fontSize={12}
              fontWeight="600"
              fontFamily="$body"
              color={palette.tagText}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("curated.estimatedBadge")}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Pressable>
  )
})

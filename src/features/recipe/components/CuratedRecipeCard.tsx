import { Pressable } from "react-native"
import { Image } from "expo-image"
import { YStack, XStack, Text, View } from "tamagui"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import type { CuratedRecipe } from "../data/curatedRecipeTypes"
import { getCuratedRecipeImage } from "../data/curatedRecipeImages"

const COLORS = {
  light: {
    bg: "#FFFFFF",
    title: tokens.color.textLight.val,
    sub: "#8E8E93",
    tagBg: "#F2F2F7",
    tagText: "#636366",
    border: "#E5E5EA",
  },
  dark: {
    bg: tokens.color.cardBgDark.val,
    title: tokens.color.textDark.val,
    sub: tokens.color.textDarkSub.val,
    tagBg: "#3A3A42",
    tagText: tokens.color.textDarkSub.val,
    border: "#3A3A42",
  },
} as const

const FRIENDLINESS_CONFIG = {
  low_risk: { label: "신장 안전", bg: "#D1FAE5", text: "#065F46" },
  moderate: { label: "적당히 섭취", bg: "#FEF3C7", text: "#92400E" },
  high_risk: { label: "주의 필요", bg: "#FEE2E2", text: "#991B1B" },
  caution: { label: "주의 필요", bg: "#FEE2E2", text: "#991B1B" },
} as const

interface CuratedRecipeCardProps {
  recipe: CuratedRecipe
  onPress?: () => void
}

export function CuratedRecipeCard({ recipe, onPress }: CuratedRecipeCardProps) {
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  const friendlinessKey = recipe.nutrition
    .ckd_friendliness as keyof typeof FRIENDLINESS_CONFIG
  const friendlinessConfig =
    FRIENDLINESS_CONFIG[friendlinessKey] ?? FRIENDLINESS_CONFIG.moderate

  const categoryLabel = recipe.category
  const difficultyLabel = recipe.difficulty
  const timeLabel = `${recipe.time_min}분`

  const visibleTags = recipe.tags.slice(0, 3)
  const image = getCuratedRecipeImage(recipe.id)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <YStack
        backgroundColor={palette.bg}
        borderRadius={12}
        padding={12}
        gap={8}
        borderWidth={1}
        borderColor={palette.border}
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
              source={image}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          </View>
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

        {/* Tags */}
        {visibleTags.length > 0 && (
          <XStack gap={6} flexWrap="wrap">
            {visibleTags.map((tag) => (
              <XStack
                key={tag}
                paddingHorizontal={7}
                paddingVertical={3}
                borderRadius={6}
                backgroundColor={palette.tagBg}
              >
                <Text fontSize={11} fontFamily="$body" color={palette.tagText}>
                  {tag}
                </Text>
              </XStack>
            ))}
          </XStack>
        )}

        {/* CKD Friendliness badge */}
        <XStack>
          <XStack
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={8}
            backgroundColor={friendlinessConfig.bg}
          >
            <Text
              fontSize={12}
              fontWeight="600"
              fontFamily="$body"
              color={friendlinessConfig.text}
            >
              {friendlinessConfig.label}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Pressable>
  )
}

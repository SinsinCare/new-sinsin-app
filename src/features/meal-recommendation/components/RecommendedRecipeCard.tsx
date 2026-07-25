import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text, View } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import type { RecommendedRecipe } from "../types"

interface RecommendedRecipeCardProps {
  recipe: RecommendedRecipe
  onPress?: () => void
  onDismiss?: () => void
  onBookmark?: () => void
}

export function RecommendedRecipeCard({
  recipe,
  onPress,
  onDismiss,
  onBookmark,
}: RecommendedRecipeCardProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const cardBg = isDark ? tokens.color.cardBgDark.val : "#FFFFFF"
  const textColor = isDark ? tokens.color.textDark.val : tokens.color.textLight.val
  const subColor = isDark ? tokens.color.textDarkSub.val : tokens.color.grey5.val
  const scoreBg =
    recipe.kidneyScore >= 90
      ? "#34D399"
      : recipe.kidneyScore >= 80
        ? "#0D896A"
        : "#F59E0B"

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <YStack
        width={200}
        backgroundColor={cardBg}
        borderRadius={16}
        padding={14}
        gap={10}
        borderWidth={1}
        borderColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.08}
        shadowRadius={8}
        elevation={3}
      >
        {/* Header: Score badge + actions */}
        <XStack justifyContent="space-between" alignItems="center">
          <View
            backgroundColor={scoreBg}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={10}
          >
            <Text fontSize={11} fontFamily="$body" fontWeight="700" color="#FFF">
              {Math.round(recipe.kidneyScore)}점
            </Text>
          </View>
          <XStack gap={6}>
            {onBookmark && (
              <Pressable onPress={onBookmark} hitSlop={8}>
                <Ionicons
                  name="bookmark-outline"
                  size={16}
                  color={subColor}
                />
              </Pressable>
            )}
            {onDismiss && (
              <Pressable onPress={onDismiss} hitSlop={8}>
                <Ionicons name="close" size={16} color={subColor} />
              </Pressable>
            )}
          </XStack>
        </XStack>

        {/* Name */}
        <Text
          fontSize={15}
          fontFamily="$body"
          fontWeight="700"
          color={textColor}
          numberOfLines={2}
        >
          {recipe.name}
        </Text>

        {/* Tags */}
        <XStack flexWrap="wrap" gap={4}>
          {recipe.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              backgroundColor={
                isDark ? "rgba(13,137,106,0.15)" : "rgba(13,137,106,0.1)"
              }
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={8}
            >
              <Text fontSize={11} fontFamily="$body" color="#0D896A">
                {tag}
              </Text>
            </View>
          ))}
        </XStack>

        {/* Reason */}
        <Text
          fontSize={12}
          fontFamily="$body"
          color={subColor}
          numberOfLines={2}
        >
          {recipe.reason}
        </Text>

        {/* Key nutrients */}
        <XStack gap={8}>
          <Text fontSize={10} fontFamily="$body" color={subColor}>
            Na {Math.round(recipe.nutrients.sodium)}mg
          </Text>
          <Text fontSize={10} fontFamily="$body" color={subColor}>
            K {Math.round(recipe.nutrients.potassium)}mg
          </Text>
          <Text fontSize={10} fontFamily="$body" color={subColor}>
            P {Math.round(recipe.nutrients.phosphorus)}mg
          </Text>
        </XStack>
      </YStack>
    </Pressable>
  )
}

import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
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
  const textColor = isDark
    ? tokens.color.textDark.val
    : tokens.color.textLight.val
  const subColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.grey5.val
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
        {/* 임상 검증 근거가 없는 kidneyScore는 안전 점수처럼 보이지 않게 숨긴다. */}
        <XStack justifyContent="flex-end" alignItems="center">
          <XStack gap={6}>
            {onBookmark && (
              <Pressable onPress={onBookmark} hitSlop={8}>
                <Ionicons name="bookmark-outline" size={16} color={subColor} />
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

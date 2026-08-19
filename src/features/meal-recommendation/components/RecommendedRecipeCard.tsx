import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
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
      <V2VStack
        padding={14}
        gap={10}
        style={{
          width: 200,
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* 임상 검증 근거가 없는 kidneyScore는 안전 점수처럼 보이지 않게 숨긴다. */}
        <V2HStack justify="flex-end" align="center">
          <V2HStack gap={6}>
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
          </V2HStack>
        </V2HStack>

        {/* Name */}
        <V2Text
          color={textColor}
          numberOfLines={2}
          style={{ fontSize: 15, fontWeight: "700" }}
        >
          {recipe.name}
        </V2Text>

        {/* Reason */}
        <V2Text color={subColor} numberOfLines={2} style={{ fontSize: 12 }}>
          {recipe.reason}
        </V2Text>

        {/* Key nutrients */}
        <V2HStack gap={8}>
          <V2Text color={subColor} style={{ fontSize: 10 }}>
            Na {Math.round(recipe.nutrients.sodium)}mg
          </V2Text>
          <V2Text color={subColor} style={{ fontSize: 10 }}>
            K {Math.round(recipe.nutrients.potassium)}mg
          </V2Text>
          <V2Text color={subColor} style={{ fontSize: 10 }}>
            P {Math.round(recipe.nutrients.phosphorus)}mg
          </V2Text>
        </V2HStack>
      </V2VStack>
    </Pressable>
  )
}

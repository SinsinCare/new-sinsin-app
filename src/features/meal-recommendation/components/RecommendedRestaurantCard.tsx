import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import type { RecommendedRestaurantMenu } from "../types"

interface RecommendedRestaurantCardProps {
  menu: RecommendedRestaurantMenu
  onPress?: () => void
  onDismiss?: () => void
  onBookmark?: () => void
}

export function RecommendedRestaurantCard({
  menu,
  onPress,
  onDismiss,
  onBookmark,
}: RecommendedRestaurantCardProps) {
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
        {/* 개인 처방과 연결되지 않은 riskLevel은 안전 등급으로 노출하지 않는다. */}
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

        {/* Restaurant name */}
        <V2Text color={subColor} numberOfLines={1} style={{ fontSize: 12 }}>
          {menu.restaurantName}
        </V2Text>

        {/* Menu name */}
        <V2Text
          color={textColor}
          numberOfLines={2}
          style={{ fontSize: 15, fontWeight: "700" }}
        >
          {menu.menuName}
        </V2Text>

        {/* Reason */}
        <V2Text color={subColor} numberOfLines={2} style={{ fontSize: 12 }}>
          {menu.reason}
        </V2Text>

        {/* Key nutrients */}
        <V2HStack gap={8}>
          <V2Text color={subColor} style={{ fontSize: 10 }}>
            Na {Math.round(menu.nutrients.sodium)}mg
          </V2Text>
          <V2Text color={subColor} style={{ fontSize: 10 }}>
            K {Math.round(menu.nutrients.potassium)}mg
          </V2Text>
          <V2Text color={subColor} style={{ fontSize: 10 }}>
            P {Math.round(menu.nutrients.phosphorus)}mg
          </V2Text>
        </V2HStack>
      </V2VStack>
    </Pressable>
  )
}

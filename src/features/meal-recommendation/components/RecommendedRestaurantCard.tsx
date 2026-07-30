import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
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
        {/* 개인 처방과 연결되지 않은 riskLevel은 안전 등급으로 노출하지 않는다. */}
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

        {/* Restaurant name */}
        <Text
          fontSize={12}
          fontFamily="$body"
          color={subColor}
          numberOfLines={1}
        >
          {menu.restaurantName}
        </Text>

        {/* Menu name */}
        <Text
          fontSize={15}
          fontFamily="$body"
          fontWeight="700"
          color={textColor}
          numberOfLines={2}
        >
          {menu.menuName}
        </Text>

        {/* Reason */}
        <Text
          fontSize={12}
          fontFamily="$body"
          color={subColor}
          numberOfLines={2}
        >
          {menu.reason}
        </Text>

        {/* Key nutrients */}
        <XStack gap={8}>
          <Text fontSize={10} fontFamily="$body" color={subColor}>
            Na {Math.round(menu.nutrients.sodium)}mg
          </Text>
          <Text fontSize={10} fontFamily="$body" color={subColor}>
            K {Math.round(menu.nutrients.potassium)}mg
          </Text>
          <Text fontSize={10} fontFamily="$body" color={subColor}>
            P {Math.round(menu.nutrients.phosphorus)}mg
          </Text>
        </XStack>
      </YStack>
    </Pressable>
  )
}

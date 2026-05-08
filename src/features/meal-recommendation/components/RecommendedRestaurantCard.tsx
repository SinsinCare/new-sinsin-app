import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"
import type { RecommendedRestaurantMenu } from "../types"

interface RecommendedRestaurantCardProps {
  menu: RecommendedRestaurantMenu
  onPress?: () => void
  onDismiss?: () => void
  onBookmark?: () => void
}

const RISK_BADGE = {
  SAFE: { bg: "#34D399", label: "안전" },
  CAUTION: { bg: "#F59E0B", label: "주의" },
  HIGH_RISK: { bg: "#EF4444", label: "위험" },
} as const

export function RecommendedRestaurantCard({
  menu,
  onPress,
  onDismiss,
  onBookmark,
}: RecommendedRestaurantCardProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const cardBg = isDark ? tokens.color.cardBgDark.val : "#FFFFFF"
  const textColor = isDark ? tokens.color.textDark.val : tokens.color.textLight.val
  const subColor = isDark ? tokens.color.textDarkSub.val : tokens.color.grey5.val
  const badge = RISK_BADGE[menu.riskLevel] ?? RISK_BADGE.CAUTION

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
        {/* Header: Risk badge + actions */}
        <XStack justifyContent="space-between" alignItems="center">
          <View
            backgroundColor={badge.bg}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={10}
          >
            <Text fontSize={11} fontFamily="$body" fontWeight="700" color="#FFF">
              {badge.label}
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

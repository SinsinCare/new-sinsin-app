import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import restaurantsJson from "../data/restaurantsData.json"
import type { RestaurantDataItem, RestaurantsData, FilterScore } from "../data/restaurantDataTypes"

const COLORS = {
  light: {
    bg: "#FFFFFF",
    overlay: "rgba(0,0,0,0.45)",
    title: tokens.color.textLight.val,
    sub: "#8E8E93",
    sectionTitle: tokens.color.textLight.val,
    label: "#636366",
    value: tokens.color.textLight.val,
    divider: "#E5E5EA",
    badgeBg: "#F2F2F7",
    badgeText: "#636366",
    featureBg: "#F2F2F7",
    featureText: "#636366",
    menuBg: "#F9F9FB",
    menuBorder: "#E5E5EA",
  },
  dark: {
    bg: tokens.color.cardBgDark.val,
    overlay: "rgba(0,0,0,0.65)",
    title: tokens.color.textDark.val,
    sub: tokens.color.textDarkSub.val,
    sectionTitle: tokens.color.textDark.val,
    label: tokens.color.textDarkSub.val,
    value: tokens.color.textDark.val,
    divider: "#3A3A42",
    badgeBg: "#3A3A42",
    badgeText: tokens.color.textDarkSub.val,
    featureBg: "#3A3A42",
    featureText: tokens.color.textDarkSub.val,
    menuBg: "#26262D",
    menuBorder: "#3A3A42",
  },
} as const

const SAFETY_TIER_CONFIG = {
  highly_recommended: {
    label: "✓ 신장 건강 추천",
    bg: "#D1FAE5",
    text: "#065F46",
  },
  partial: {
    label: "◐ 메뉴 선택 필요",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  limited: {
    label: "△ 섭취량 조절 필요",
    bg: "#FEE2E2",
    text: "#991B1B",
  },
} as const

const FILTER_SCORE_CONFIG: Record<FilterScore, { bg: string; text: string }> = {
  pass: { bg: "#D1FAE5", text: "#065F46" },
  mid: { bg: "#FEF3C7", text: "#92400E" },
  fail: { bg: "#FEE2E2", text: "#991B1B" },
}

const FILTER_LABEL_MAP: Record<string, string> = {
  low_sodium: "저염",
  low_sugar: "저당",
  low_protein: "저단백",
  low_potassium: "저칼륨",
  low_phosphorus: "저인",
}

const DAY_MAP: Record<string, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
}

const allRestaurants = (restaurantsJson as RestaurantsData).restaurants

function getTodayHours(hours: RestaurantDataItem["hours"]): string {
  const dayKey = DAY_MAP[new Date().getDay()]
  return (hours as Record<string, string | undefined>)[dayKey] ?? "정보 없음"
}

function getPriceLevel(level: number): string {
  return "💰".repeat(Math.min(Math.max(level, 1), 3))
}

interface RestaurantDetailSheetProps {
  restaurantId: string | null
  visible: boolean
  onClose: () => void
}

export function RestaurantDetailSheet({
  restaurantId,
  visible,
  onClose,
}: RestaurantDetailSheetProps) {
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()

  const restaurant = restaurantId
    ? allRestaurants.find((r) => r.id === restaurantId) ?? null
    : null

  if (!restaurant) return null

  const safetyConfig =
    SAFETY_TIER_CONFIG[restaurant.safety_tier] ?? SAFETY_TIER_CONFIG.partial

  const todayHours = getTodayHours(restaurant.hours)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: palette.overlay }]} onPress={onClose} />

      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={palette.bg}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        style={{ maxHeight: screenHeight * 0.85 }}
        paddingBottom={insets.bottom + 16}
      >
        {/* Handle bar */}
        <YStack alignItems="center" paddingTop={12} paddingBottom={4}>
          <View width={40} height={4} borderRadius={2} backgroundColor={palette.divider} />
        </YStack>

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
              {restaurant.name}
            </Text>
            <XStack gap={8} alignItems="center" flexWrap="wrap">
              <XStack
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={8}
                backgroundColor={palette.badgeBg}
              >
                <Text fontSize={12} fontWeight="600" fontFamily="$body" color={palette.badgeText}>
                  {restaurant.cuisine}
                </Text>
              </XStack>
              <Text fontSize={12} fontFamily="$body" color={palette.sub} numberOfLines={1}>
                {restaurant.address}
              </Text>
            </XStack>
          </YStack>
          <Pressable
            onPress={onClose}
            hitSlop={8}
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

        <View height={1} backgroundColor={palette.divider} marginHorizontal={20} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 16 }}
        >
          {/* 기본 정보 */}
          <XStack gap={12} alignItems="center" flexWrap="wrap">
            <Text fontSize={14} fontFamily="$body" color={palette.sub}>
              ⭐ {restaurant.rating.toFixed(1)} · 리뷰 {restaurant.review_count}개 · {getPriceLevel(restaurant.price_level)}
            </Text>
          </XStack>

          {/* 안전등급 배지 */}
          <XStack>
            <XStack
              paddingHorizontal={12}
              paddingVertical={6}
              borderRadius={10}
              backgroundColor={safetyConfig.bg}
            >
              <Text fontSize={13} fontWeight="700" fontFamily="$body" color={safetyConfig.text}>
                {safetyConfig.label}
              </Text>
            </XStack>
          </XStack>

          {/* 특징 칩들 */}
          {restaurant.features.length > 0 && (
            <XStack gap={8} flexWrap="wrap">
              {restaurant.features.map((feature) => (
                <XStack
                  key={feature}
                  paddingHorizontal={10}
                  paddingVertical={5}
                  borderRadius={8}
                  backgroundColor={palette.featureBg}
                >
                  <Text fontSize={12} fontFamily="$body" color={palette.featureText}>
                    {feature}
                  </Text>
                </XStack>
              ))}
            </XStack>
          )}

          {/* 오늘 영업시간 */}
          <XStack gap={8} alignItems="center">
            <Text fontSize={13} fontWeight="600" fontFamily="$body" color={palette.label}>
              오늘 영업시간
            </Text>
            <Text fontSize={13} fontFamily="$body" color={palette.value}>
              {todayHours}
            </Text>
          </XStack>

          <View height={1} backgroundColor={palette.divider} />

          {/* 메뉴 목록 */}
          {restaurant.menus.length > 0 && (
            <YStack gap={12}>
              <Text fontSize={16} fontWeight="700" fontFamily="$body" color={palette.sectionTitle}>
                메뉴 ({restaurant.menus.length}개)
              </Text>
              <YStack gap={10}>
                {restaurant.menus.map((menu) => {
                  const n = menu.estimated_nutrition
                  const scores = menu.filter_scores
                  const scoreEntries = Object.entries(scores) as [string, FilterScore][]

                  return (
                    <YStack
                      key={menu.id}
                      backgroundColor={palette.menuBg}
                      borderRadius={12}
                      padding={12}
                      gap={8}
                      borderWidth={1}
                      borderColor={palette.menuBorder}
                    >
                      {/* 메뉴명 + note */}
                      <XStack gap={6} alignItems="flex-start" flexWrap="wrap">
                        <Text
                          fontSize={15}
                          fontWeight="600"
                          fontFamily="$body"
                          color={palette.value}
                          flex={1}
                        >
                          {menu.name}
                        </Text>
                      </XStack>
                      {menu.note && (
                        <Text fontSize={12} fontFamily="$body" color={palette.sub}>
                          {menu.note}
                        </Text>
                      )}

                      {/* 칼로리 + 주요 영양소 */}
                      <Text fontSize={12} fontFamily="$body" color={palette.sub}>
                        {n.kcal}kcal · 나트륨 {n.sodium_mg}mg · 단백질 {n.protein_g}g · 칼륨 {n.potassium_mg}mg
                      </Text>

                      {/* 필터 스코어 칩들 */}
                      <XStack gap={6} flexWrap="wrap">
                        {scoreEntries.map(([key, score]) => {
                          const config = FILTER_SCORE_CONFIG[score]
                          const label = FILTER_LABEL_MAP[key] ?? key
                          return (
                            <XStack
                              key={key}
                              paddingHorizontal={7}
                              paddingVertical={3}
                              borderRadius={6}
                              backgroundColor={config.bg}
                            >
                              <Text
                                fontSize={11}
                                fontWeight="600"
                                fontFamily="$body"
                                color={config.text}
                              >
                                {label}
                              </Text>
                            </XStack>
                          )
                        })}
                      </XStack>
                    </YStack>
                  )
                })}
              </YStack>
            </YStack>
          )}

          <YStack height={8} />
        </ScrollView>
      </YStack>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})

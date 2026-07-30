import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { normalizeLanguage } from "@/src/i18n"
import { tokens } from "@/src/theme/tokens"
import restaurantsJson from "../data/restaurantsData.json"
import type {
  RestaurantDataItem,
  RestaurantsData,
} from "../data/restaurantDataTypes"
import {
  getCatalogAddress,
  getCatalogCuisineLabel,
  getCatalogFeatureLabels,
  getCatalogHours,
  getCatalogMenuName,
  getCatalogRestaurantName,
} from "../utils/restaurantLocalization"

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

function getTodayHoursValue(
  hours: RestaurantDataItem["hours"],
): string | undefined {
  const dayKey = DAY_MAP[new Date().getDay()]
  return (hours as Record<string, string | undefined>)[dayKey]
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
  const { t, i18n } = useTranslation("common")
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()

  const restaurant = restaurantId
    ? (allRestaurants.find((r) => r.id === restaurantId) ?? null)
    : null

  if (!restaurant) return null

  const language = normalizeLanguage(i18n.resolvedLanguage)
  const todayHours = getCatalogHours(
    getTodayHoursValue(restaurant.hours),
    t,
    language,
  )
  const cuisine = getCatalogCuisineLabel(restaurant.cuisine, t, language)
  const features = getCatalogFeatureLabels(restaurant.features, language)
  const restaurantName = getCatalogRestaurantName(
    restaurant.id,
    restaurant.name,
    language,
  )
  const address = getCatalogAddress(restaurant.id, restaurant.address, language)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlay }]}
        onPress={onClose}
      />

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
          <View
            width={40}
            height={4}
            borderRadius={2}
            backgroundColor={palette.divider}
          />
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
              {restaurantName}
            </Text>
            <XStack gap={8} alignItems="center" flexWrap="wrap">
              <XStack
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={8}
                backgroundColor={palette.badgeBg}
              >
                <Text
                  fontSize={12}
                  fontWeight="600"
                  fontFamily="$body"
                  color={palette.badgeText}
                >
                  {cuisine}
                </Text>
              </XStack>
              <Text
                fontSize={12}
                fontFamily="$body"
                color={palette.sub}
                numberOfLines={1}
              >
                {address}
              </Text>
            </XStack>
          </YStack>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.detail.close")}
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

        <ScrollView
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 16 }}
        >
          {/* 기본 정보 */}
          <XStack gap={12} alignItems="center" flexWrap="wrap">
            <Text fontSize={14} fontFamily="$body" color={palette.sub}>
              ⭐ {restaurant.rating.toFixed(1)} ·{" "}
              {t("restaurant.reviews", {
                count: restaurant.review_count,
              })}{" "}
              · {getPriceLevel(restaurant.price_level)}
            </Text>
          </XStack>

          {/* 특징 칩들 */}
          {features.length > 0 && (
            <XStack gap={8} flexWrap="wrap">
              {features.map((feature) => (
                <XStack
                  key={feature}
                  paddingHorizontal={10}
                  paddingVertical={5}
                  borderRadius={8}
                  backgroundColor={palette.featureBg}
                >
                  <Text
                    fontSize={12}
                    fontFamily="$body"
                    color={palette.featureText}
                  >
                    {feature}
                  </Text>
                </XStack>
              ))}
            </XStack>
          )}

          {/* 오늘 영업시간 */}
          <XStack gap={8} alignItems="center">
            <Text
              fontSize={13}
              fontWeight="600"
              fontFamily="$body"
              color={palette.label}
            >
              {t("restaurant.detail.todayHours")}
            </Text>
            <Text fontSize={13} fontFamily="$body" color={palette.value}>
              {todayHours}
            </Text>
          </XStack>

          <View height={1} backgroundColor={palette.divider} />

          {/* 메뉴 목록 */}
          {restaurant.menus.length > 0 && (
            <YStack gap={12}>
              <Text
                fontSize={16}
                fontWeight="700"
                fontFamily="$body"
                color={palette.sectionTitle}
              >
                {t("restaurant.detail.menus", {
                  count: restaurant.menus.length,
                })}
              </Text>
              <Text
                fontSize={12}
                lineHeight={18}
                fontFamily="$body"
                color={palette.sub}
              >
                {t("restaurant.detail.nutritionDisclaimer")}
              </Text>
              <YStack gap={10}>
                {restaurant.menus.map((menu) => {
                  const n = menu.estimated_nutrition

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
                          {getCatalogMenuName(menu.id, menu.name, language)}
                        </Text>
                      </XStack>
                      {/* 칼로리 + 주요 영양소 */}
                      <Text
                        fontSize={12}
                        fontFamily="$body"
                        color={palette.sub}
                      >
                        {t("restaurant.detail.nutritionLine", {
                          kcal: n.kcal,
                          sodium: n.sodium_mg,
                          protein: n.protein_g,
                          potassium: n.potassium_mg,
                        })}
                      </Text>
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

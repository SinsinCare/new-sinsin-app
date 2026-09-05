import { memo } from "react"
import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { Pressable } from "react-native-gesture-handler"
import { useTranslation } from "react-i18next"
import { V2Icon, spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import type { BookmarkCardDto, RestaurantCardDto } from "../types"
import { cuisineTypeLabelKey } from "../data/filterCatalog"
import { formatDistanceKm } from "../utils/distance"
import { BusinessStatusText } from "./BusinessStatusText"
import { RestaurantThumbnail } from "./RestaurantThumbnail"
import { RestaurantNutritionSummary } from "./RestaurantNutritionSummary"
import { GUTTER } from "../layout"

export interface RestaurantCardProps {
  card: RestaurantCardDto | BookmarkCardDto
  selected?: boolean
  onPress?: () => void
  style?: ViewStyle
}

export const RestaurantCard = memo(function RestaurantCard({
  card,
  selected = false,
  onPress,
  style,
}: RestaurantCardProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const cuisine = t(dynamicKey(cuisineTypeLabelKey(card.cuisineType)))
  const location = [formatDistanceKm(card.distanceKm), card.shortAddress]
    .filter(Boolean)
    .join(" · ")
  const ratingLabel =
    card.rating !== null
      ? t("restaurant.detail.ratingAccessibility", {
          rating: card.rating.toFixed(1),
          count: card.reviewCount,
        })
      : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[
        card.name,
        ratingLabel,
        cuisine,
        location,
        t(dynamicKey("restaurant.businessStatus." + card.businessStatus)),
      ]
        .filter(Boolean)
        .join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: selected
            ? colors.fill.normal
            : colors.background.default,
          borderLeftColor: selected ? colors.primary.primary : "transparent",
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.main}>
        <View style={styles.body}>
          <Text
            style={[typography.label.small, { color: colors.label.normal }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {card.name}
          </Text>
          <View style={styles.metaRow}>
            {card.rating !== null && (
              <View style={styles.rating}>
                <V2Icon
                  name="starFilled"
                  size="xs"
                  color={colors.label.normal}
                />
                <Text
                  style={[
                    typography.label.xSmall,
                    styles.numeric,
                    { color: colors.label.normal },
                  ]}
                >
                  {card.rating.toFixed(1)}
                </Text>
                <Text
                  style={[
                    typography.subtext.small,
                    styles.numeric,
                    { color: colors.label.neutral },
                  ]}
                >
                  {"(" + card.reviewCount.toLocaleString() + ")"}
                </Text>
                <Text
                  style={[
                    typography.subtext.small,
                    { color: colors.label.assistive },
                  ]}
                >
                  ·
                </Text>
              </View>
            )}
            <Text
              style={[
                typography.subtext.small,
                { color: colors.label.neutral },
              ]}
            >
              {cuisine}
            </Text>
          </View>
          {location.length > 0 && (
            <Text
              style={[
                typography.subtext.small,
                { color: colors.label.neutral },
              ]}
              lineBreakStrategyIOS="hangul-word"
            >
              {location}
            </Text>
          )}
          <BusinessStatusText
            status={card.businessStatus}
            closingTime={card.closeTime}
            openingTime={card.openTime}
            breakEndTime={"breakEnd" in card ? card.breakEnd : null}
          />
          <RestaurantNutritionSummary
            safety={"safety" in card ? card.safety : null}
          />
        </View>
        <RestaurantThumbnail urls={card.imageUrls} name={card.name} />
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: GUTTER,
    paddingLeft: GUTTER - 3,
    borderLeftWidth: 3,
    paddingVertical: spacing[16],
  },
  main: { flexDirection: "row", alignItems: "stretch", gap: spacing[12] },
  body: { flex: 1, gap: spacing[4] },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[6],
  },
  rating: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  numeric: { fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.7 },
})

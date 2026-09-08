import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { memo } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import { Pressable } from "react-native-gesture-handler"
import { useTranslation } from "react-i18next"
import {
  V2Badge,
  V2Icon,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import type { BookmarkCardDto, RestaurantCardDto } from "../types"
import { cuisineTypeLabelKey } from "../data/filterCatalog"
import { formatDistanceKm } from "../utils/distance"
import { cardConcernNutrients } from "../utils/cardSafetyBadge"
import { BusinessStatusText } from "./BusinessStatusText"
import { PhotoStrip } from "./PhotoStrip"
import { RestaurantMenuSummary } from "./RestaurantMenuSummary"
import type { RestaurantCardTarget } from "../utils/restaurantCardNavigation"
import { GUTTER } from "../layout"

export interface RestaurantCardProps {
  card: RestaurantCardDto | BookmarkCardDto
  selected?: boolean
  onPress?: (target: RestaurantCardTarget) => void
  style?: ViewStyle
}

export const RestaurantCard = memo(function RestaurantCard({
  card,
  selected = false,
  onPress,
  style,
}: RestaurantCardProps) {
  const { t } = useTranslation("common")
  const { colors, mode, primitives } = useV2Theme()
  const cuisine = t(dynamicKey(cuisineTypeLabelKey(card.cuisineType)))
  const concerns = cardConcernNutrients("safety" in card ? card.safety : null)
  const concernLabels = concerns.map((nutrient) =>
    t(dynamicKey(`restaurant.safety.driver.${nutrient}`)),
  )
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
    <View
      style={[
        styles.root,
        {
          backgroundColor: selected
            ? colors.fill.normal
            : colors.background.default,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[
          card.name,
          ...concernLabels.map(
            (label) => `${label} ${t("restaurant.safety.CAUTION")}`,
          ),
          cuisine,
          ratingLabel,
          location,
          t(dynamicKey("restaurant.businessStatus." + card.businessStatus)),
        ]
          .filter(Boolean)
          .join(", ")}
        onPress={onPress ? () => onPress({ type: "home" }) : undefined}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.identity}>
          <Text
            style={[
              typography.label.small,
              styles.name,
              { color: colors.label.normal },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {card.name}
          </Text>
          {concerns.map((nutrient, index) => (
            <V2Badge
              key={nutrient}
              size="xs"
              color="red"
              variant="weak"
              style={styles.nutrientBadge}
            >
              <Text
                style={{
                  color:
                    mode === "light"
                      ? primitives.red[700]
                      : primitives.red[300],
                }}
              >
                {concernLabels[index]}
              </Text>
            </V2Badge>
          ))}
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
          >
            {cuisine}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <BusinessStatusText
            tone="neutral"
            status={card.businessStatus}
            closingTime={card.closeTime}
            openingTime={card.openTime}
            breakEndTime={"breakEnd" in card ? card.breakEnd : null}
          />
          {card.rating !== null && (
            <View style={styles.rating}>
              <Text
                style={[
                  typography.subtext.small,
                  { color: colors.label.assistive },
                ]}
              >
                ·
              </Text>
              <V2Icon
                name="starFilled"
                size="xs"
                color={colors.primary.primary}
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
            </View>
          )}
          {card.reviewCount > 0 && (
            <Text
              style={[
                typography.subtext.medium,
                styles.numeric,
                { color: colors.label.neutral },
              ]}
            >
              {t("restaurant.detail.metaReviews", {
                formattedCount: card.reviewCount.toLocaleString(),
              })}
            </Text>
          )}
        </View>
        {location.length > 0 && (
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {location}
          </Text>
        )}
      </Pressable>
      <PhotoStrip
        urls={card.imageUrls}
        name={card.name}
        onPress={
          onPress
            ? (urls, index) => onPress({ type: "photos", urls, index })
            : undefined
        }
      />
      <RestaurantMenuSummary
        names={
          "representativeMenuNames" in card
            ? card.representativeMenuNames
            : undefined
        }
        selected={selected}
        onPress={onPress ? () => onPress({ type: "menu" }) : undefined}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: GUTTER,
    paddingVertical: spacing[16],
    gap: spacing[12],
  },
  body: { gap: spacing[6] },
  identity: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing[6],
    rowGap: spacing[4],
  },
  name: { flexShrink: 1 },
  nutrientBadge: {
    borderRadius: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: 0,
  },
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

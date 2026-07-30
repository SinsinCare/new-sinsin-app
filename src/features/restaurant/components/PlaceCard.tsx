import { Image, Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { ScrollView } from "react-native-gesture-handler"
import { Text, XStack, YStack } from "tamagui"
import { useRouter } from "expo-router"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"
import { normalizeLanguage } from "@/src/i18n"
import type { PlaceRestaurant } from "../types"
import {
  getLocalizedCategoryTags,
  getLocalizedDescription,
} from "../utils/restaurantLocalization"

interface PlaceCardProps {
  restaurant: PlaceRestaurant
}

export function PlaceCard({ restaurant }: PlaceCardProps) {
  const { t, i18n } = useTranslation("common")
  const isDarkMode = useAppColorScheme() === "dark"
  const router = useRouter()
  const restaurantTextColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.textLight.val
  const borderColor = isDarkMode ? "#2A2A2E" : "#F0F0F0"
  const subTextColor = isDarkMode ? tokens.color.textDarkSub.val : "#8E8E93"
  const language = normalizeLanguage(i18n.resolvedLanguage)
  const tags = getLocalizedCategoryTags(restaurant.tags, language)
  const description = getLocalizedDescription(
    restaurant.description,
    t,
    language,
  )

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/restaurant/[id]",
          params: { id: restaurant.id },
        })
      }
      style={[styles.container, { borderBottomColor: borderColor }]}
    >
      <YStack gap={4} paddingHorizontal={16} paddingVertical={12}>
        {/* Name + Tags */}
        <XStack alignItems="center" gap={8}>
          <Text
            fontFamily="$body"
            fontWeight="700"
            fontSize={16}
            color={restaurantTextColor}
          >
            {restaurant.name}
          </Text>
          <XStack gap={4}>
            {tags.map((tag, i) => (
              <Text
                key={i}
                fontFamily="$body"
                fontSize={13}
                color={subTextColor}
              >
                {tag}
              </Text>
            ))}
          </XStack>
        </XStack>

        {/* Description */}
        <Text fontFamily="$body" fontSize={13} color={subTextColor}>
          {description}
        </Text>

        {/* Rating + Reviews */}
        {restaurant.rating != null && (
          <XStack alignItems="center" gap={4}>
            <Text fontFamily="$body" fontSize={13} color={subTextColor}>
              ★ {restaurant.rating}
            </Text>
            {restaurant.reviewCount != null && (
              <Text fontFamily="$body" fontSize={13} color={subTextColor}>
                ·{" "}
                {t("restaurant.reviews", {
                  count: restaurant.reviewCount,
                })}
              </Text>
            )}
          </XStack>
        )}

        {/* Distance + Address */}
        <XStack alignItems="center" gap={4}>
          <Text fontFamily="$body" fontSize={13} color={subTextColor}>
            {restaurant.distance}
          </Text>
          <Text fontFamily="$body" fontSize={13} color={subTextColor}>
            · {restaurant.address}
          </Text>
        </XStack>

        {/* Image Gallery */}
        <ScrollView
          bounces={false}
          overScrollMode="never"
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageGallery}
          style={styles.imageScroll}
        >
          {restaurant.images.map((img, i) => (
            <Image
              key={i}
              source={typeof img === "number" ? img : { uri: img }}
              style={styles.image}
            />
          ))}
        </ScrollView>
      </YStack>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  imageScroll: {
    marginTop: 4,
  },
  imageGallery: {
    gap: 8,
  },
  image: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
})

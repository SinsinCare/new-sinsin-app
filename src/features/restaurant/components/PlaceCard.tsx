import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { Text, XStack, YStack } from "tamagui"
import type { PlaceRestaurant } from "../types"

interface PlaceCardProps {
  restaurant: PlaceRestaurant
}

export function PlaceCard({ restaurant }: PlaceCardProps) {
  const isDarkMode = useColorScheme() === "dark"
  const restaurantTextColor = isDarkMode ? "#E7E7EE" : "#2A2A37"
  const borderColor = isDarkMode ? "#2A2A2E" : "#F0F0F0"
  const subTextColor = isDarkMode ? "#ABABB4" : "#8E8E93"

  return (
    <Pressable
      onPress={() => {}}
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
            {restaurant.tags.map((tag, i) => (
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
          {restaurant.description}
        </Text>

        {/* Rating + Reviews */}
        <XStack alignItems="center" gap={4}>
          <Text fontFamily="$body" fontSize={13} color={subTextColor}>
            ★ {restaurant.rating}
          </Text>
          <Text fontFamily="$body" fontSize={13} color={subTextColor}>
            · 리뷰 {restaurant.reviewCount}
          </Text>
        </XStack>

        {/* Distance + Address */}
        <XStack alignItems="center" gap={4}>
          <Text fontFamily="$body" fontSize={13} color={subTextColor}>
            {restaurant.distance}
          </Text>
          <Text fontFamily="$body" fontSize={13} color={subTextColor}>
            · {restaurant.address}
          </Text>
          <Text fontFamily="$body" fontSize={12} color={subTextColor}>
            ▾
          </Text>
        </XStack>

        {/* Image Gallery */}
        <ScrollView
          horizontal
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

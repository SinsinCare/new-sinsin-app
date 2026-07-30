import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { normalizeLanguage } from "@/src/i18n"
import type { PlaceRestaurant } from "../types"
import {
  getLocalizedCategoryTags,
  getLocalizedDescription,
} from "../utils/restaurantLocalization"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

interface Props {
  restaurant: PlaceRestaurant
}

export function RestaurantDetailScreen({ restaurant }: Props) {
  const { t, i18n } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const language = normalizeLanguage(i18n.resolvedLanguage)
  const foodTags = getLocalizedCategoryTags(restaurant.tags, language)
  const description = getLocalizedDescription(
    restaurant.description,
    t,
    language,
  )

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* 이미지 갤러리 */}
        <View style={styles.imageSection}>
          <ScrollView
            bounces={false}
            overScrollMode="never"
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
              )
              setActiveImageIndex(index)
            }}
          >
            {restaurant.images.map((img, i) => (
              <Image
                key={i}
                source={typeof img === "number" ? img : { uri: img }}
                style={styles.heroImage}
                resizeMode="cover"
                accessibilityLabel={t("restaurant.photoAccessibility", {
                  name: restaurant.name,
                  number: i + 1,
                })}
              />
            ))}
          </ScrollView>

          {/* 뒤로가기 버튼 */}
          <Pressable
            style={[styles.backButton, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.backAccessibility")}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          {/* 이미지 페이지 인디케이터 */}
          {restaurant.images.length > 1 && (
            <View style={styles.dotsRow}>
              {restaurant.images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeImageIndex
                      ? styles.dotActive
                      : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* 정보 영역 */}
        <View style={styles.content}>
          {/* 이름 + 음식 종류 */}
          <View style={styles.titleRow}>
            <ThemedText style={styles.name}>{restaurant.name}</ThemedText>
            <View style={styles.foodTagsRow}>
              {foodTags.map((tag) => (
                <View key={tag} style={styles.foodTag}>
                  <ThemedText style={styles.foodTagText}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* 평점 + 거리 */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <ThemedText style={styles.metaText}>
                {restaurant.rating} ·{" "}
                {t("restaurant.reviews", {
                  count: restaurant.reviewCount ?? 0,
                })}
              </ThemedText>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <ThemedText style={styles.metaText}>
                {restaurant.distance}
              </ThemedText>
            </View>
          </View>

          {/* 주소 */}
          <View style={styles.addressRow}>
            <Ionicons name="map-outline" size={14} color="#94A3B8" />
            <ThemedText style={styles.addressText}>
              {restaurant.address}
            </ThemedText>
          </View>

          {/* 설명 */}
          <View style={styles.divider} />
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  imageSection: {
    position: "relative",
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 18,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  titleRow: {
    gap: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#17191C",
    lineHeight: 28,
  },
  foodTagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  foodTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "#F0F2F5",
    borderRadius: 100,
  },
  foodTagText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: "#64748B",
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E2E8F0",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: "#94A3B8",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginVertical: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
})

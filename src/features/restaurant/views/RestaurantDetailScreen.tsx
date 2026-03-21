import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import type { PlaceRestaurant } from "../types"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

const NUTRIENT_INFO: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  저염: {
    label: "저염",
    color: "#0D896A",
    bg: "#F0FDF4",
    desc: "소디움 함량을 낮춰 신장 부담을 줄입니다",
  },
  저칼륨: {
    label: "저칼륨",
    color: "#0369A1",
    bg: "#F0F9FF",
    desc: "칼륨 섭취를 제한해 혈중 칼륨 농도를 관리합니다",
  },
  저인: {
    label: "저인",
    color: "#7C3AED",
    bg: "#F5F3FF",
    desc: "인 함량을 낮춰 뼈 건강과 혈관을 보호합니다",
  },
  저당: {
    label: "저당",
    color: "#B45309",
    bg: "#FFFBEB",
    desc: "혈당 관리에 적합한 저당 메뉴를 제공합니다",
  },
  저단백: {
    label: "저단백",
    color: "#BE185D",
    bg: "#FDF2F8",
    desc: "단백질 섭취를 제한해 신장 부담을 최소화합니다",
  },
}

const NUTRIENT_KEYS = Object.keys(NUTRIENT_INFO)

interface Props {
  restaurant: PlaceRestaurant
}

export function RestaurantDetailScreen({ restaurant }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const healthTags = restaurant.tags.filter((t) => NUTRIENT_KEYS.includes(t))
  const foodTags = restaurant.tags.filter((t) => !NUTRIENT_KEYS.includes(t))

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* 이미지 갤러리 */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
              setActiveImageIndex(index)
            }}
          >
            {restaurant.images.map((img, i) => (
              <Image
                key={i}
                source={typeof img === "number" ? img : { uri: img }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* 뒤로가기 버튼 */}
          <Pressable
            style={[styles.backButton, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            hitSlop={8}
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
                    i === activeImageIndex ? styles.dotActive : styles.dotInactive,
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
                {restaurant.rating} ({restaurant.reviewCount}개 리뷰)
              </ThemedText>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <ThemedText style={styles.metaText}>{restaurant.distance}</ThemedText>
            </View>
          </View>

          {/* 주소 */}
          <View style={styles.addressRow}>
            <Ionicons name="map-outline" size={14} color="#94A3B8" />
            <ThemedText style={styles.addressText}>{restaurant.address}</ThemedText>
          </View>

          {/* 설명 */}
          <View style={styles.divider} />
          <ThemedText style={styles.description}>{restaurant.description}</ThemedText>

          {/* 신장 건강 적합성 */}
          {healthTags.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.healthSection}>
                <View style={styles.healthHeader}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#0D896A" />
                  <ThemedText style={styles.healthTitle}>신장 건강 적합 정보</ThemedText>
                </View>
                {healthTags.map((tag) => {
                  const info = NUTRIENT_INFO[tag]
                  if (!info) return null
                  return (
                    <View key={tag} style={[styles.healthCard, { backgroundColor: info.bg }]}>
                      <View style={[styles.healthBadge, { backgroundColor: info.color }]}>
                        <ThemedText style={styles.healthBadgeText}>{info.label}</ThemedText>
                      </View>
                      <ThemedText style={[styles.healthDesc, { color: info.color }]}>
                        {info.desc}
                      </ThemedText>
                    </View>
                  )
                })}
              </View>
            </>
          )}
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
  healthSection: {
    gap: 10,
  },
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D896A",
  },
  healthCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  healthBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  healthDesc: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
})

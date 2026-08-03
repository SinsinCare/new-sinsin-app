import { ScrollView, StyleSheet, Text, View } from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useCommunityStories } from "../hooks/useCommunityStories"
import { useTranslation } from "react-i18next"

const CARD_WIDTH = 112
const CARD_HEIGHT = 152

/**
 * 스토리 레일 — 오늘 하루만 남는 사진들. 추천 순서는 서버가 매번 섞어 주므로
 * 늦게 올린 사람도 맨 앞에 걸린다.
 */
export function StoryRail() {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const router = useAppRouter()
  const { stories } = useCommunityStories("recommended")

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: surface.textStrong }]}>
            {t("story.title")}
          </Text>
          <Text style={[styles.subtitle, { color: surface.textMuted }]}>
            {t("story.subtitle")}
          </Text>
        </View>
        <SurfacePressable
          onPress={() => router.push("/story/new" as Href)}
          accessibilityLabel={t("story.createAccessibility")}
          baseColor={surface.isDark ? surface.surface : surface.card}
          pressScale={0.95}
          style={styles.createPill}
        >
          <Ionicons name="add" size={15} color={surface.textStrong} />
          <Text style={[styles.createLabel, { color: surface.textStrong }]}>
            {t("story.create")}
          </Text>
        </SurfacePressable>
      </View>

      {stories.length === 0 ? (
        <SurfacePressable
          onPress={() => router.push("/story/new" as Href)}
          accessibilityLabel={t("story.createFirstAccessibility")}
          baseColor={surface.isDark ? surface.surface : surface.card}
          style={styles.emptyCard}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: surface.surfaceBrand },
            ]}
          >
            <Ionicons name="camera" size={18} color={surface.brand} />
          </View>
          <View style={styles.emptyText}>
            <Text style={[styles.emptyTitle, { color: surface.textStrong }]}>
              {t("story.emptyTitle")}
            </Text>
            <Text style={[styles.emptySub, { color: surface.textMuted }]}>
              {t("story.emptyBody")}
            </Text>
          </View>
        </SurfacePressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.rail}
        >
          {stories.map((story, index) => (
            <SurfacePressable
              key={story.id}
              onPress={() => router.push(`/stories?index=${index}` as Href)}
              accessibilityLabel={t("story.accessibility", {
                author: story.authorName,
              })}
              baseColor={surface.isDark ? surface.surface : surface.card}
              pressScale={0.96}
              style={styles.card}
            >
              <Image
                source={{ uri: story.imageUri }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardScrim}>
                <Text style={styles.cardAuthor} numberOfLines={1}>
                  {story.isMine ? t("story.mine") : story.authorName}
                </Text>
              </View>
              {story.likes > 0 && (
                <View style={styles.cardLike}>
                  <Ionicons name="heart" size={11} color="#FFFFFF" />
                  <Text style={styles.cardLikeText}>{story.likes}</Text>
                </View>
              )}
            </SurfacePressable>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 22,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    gap: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.32,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  createPill: {
    height: 32,
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  createLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  rail: {
    paddingHorizontal: 20,
    gap: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    // 그라디언트 없이 반투명 잉크 한 겹으로 글자만 살린다.
    backgroundColor: "rgba(23,24,28,0.55)",
  },
  cardAuthor: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },
  cardLike: {
    position: "absolute",
    top: 8,
    right: 8,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(23,24,28,0.55)",
  },
  cardLikeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },

  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Regular",
  },
})

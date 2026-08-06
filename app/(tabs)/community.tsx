import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { FreePostTab } from "@/src/features/recipe/components/FreePostTab"
import {
  FLOATING_AI_BUTTON_BOTTOM,
  FLOATING_AI_BUTTON_HEIGHT,
} from "@/src/shared/components/FloatingAiButton"

/** 전역 AI 상담 필 위로 글쓰기 버튼을 쌓는 기준선. */
const WRITE_BUTTON_BOTTOM =
  FLOATING_AI_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT + 12

/**
 * 커뮤니티 탭 — 자유글 피드가 산다.
 * 태그 딥링크(/community?tag=...)는 글 상세의 해시태그에서 들어온다.
 * 글쓰기는 브랜드 필 — 잉크 필(AI 상담)과 위계가 섞이지 않게 색으로 가른다.
 */
export default function CommunityScreen() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const params = useLocalSearchParams<{ tag?: string }>()
  const surface = useSurface()
  const [tagFilter, setTagFilter] = useState<string | null>(
    typeof params.tag === "string" && params.tag.length > 0 ? params.tag : null,
  )

  useEffect(() => {
    if (typeof params.tag === "string") {
      setTagFilter(params.tag.length > 0 ? params.tag : null)
    }
  }, [params.tag])

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: surface.isDark ? surface.canvas : surface.surface,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("community.title")}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/community-library" as Href)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("community.myActivity")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={surface.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/community-library",
                params: { tab: "bookmarked" },
              } as Href)
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("community.bookmarks")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons
              name="bookmark-outline"
              size={21}
              color={surface.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(settings)/announcements" as Href)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("myPage.menu.announcements")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={surface.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <FreePostTab
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        contentBottomPadding={
          WRITE_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT + 24
        }
      />

      <View style={styles.writeButtonWrap} pointerEvents="box-none">
        <SurfacePressable
          onPress={() => router.push("/free/new" as Href)}
          accessibilityLabel={t("community.writeAccessibility")}
          baseColor={surface.brand}
          pressedColor="#E9632F"
          pressScale={0.94}
          style={styles.writeButton}
        >
          <Ionicons name="add" size={18} color={surface.onBrand} />
          <Text
            style={[styles.writeLabel, { color: surface.onBrand }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("community.write")}
          </Text>
        </SurfacePressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.44,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  writeButtonWrap: {
    position: "absolute",
    bottom: WRITE_BUTTON_BOTTOM,
    right: 20,
  },
  writeButton: {
    height: 44,
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.22,
    elevation: 8,
  },
  writeLabel: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
})

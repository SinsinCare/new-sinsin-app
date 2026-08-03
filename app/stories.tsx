import { useCallback, useMemo, useRef, useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated"

import { V2DotLoader } from "@/src/design-system-v2"
import { hapticSelection } from "@/src/lib/haptics"
import { MOTION } from "@/src/theme/surface"
import { useCommunityStories } from "@/src/features/recipe/hooks/useCommunityStories"
import { useBlockedUsers } from "@/src/features/recipe/hooks/useBlockedUsers"
import { communityStoryService } from "@/src/features/recipe/services/communityStoryService"
import { reportService } from "@/src/services/reportService"
import type { ReportReason } from "@/src/services/reportService"
import type {
  CommunityStory,
  StorySort,
} from "@/src/features/recipe/types/story"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import { useTranslation } from "react-i18next"

import { showSuccessToast } from "@/src/lib/toast"

import { showActionSheet, showConfirm } from "@/src/lib/dialog"

const HEART_SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
const SORTS: StorySort[] = ["recommended", "recent"]

export default function StoriesScreen() {
  const { t } = useTranslation()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const { height: windowHeight, width: windowWidth } = useWindowDimensions()
  const params = useLocalSearchParams<{ index?: string; sort?: string }>()

  const [sort, setSort] = useState<StorySort>(
    params.sort === "recent" ? "recent" : "recommended",
  )
  const { stories, isLoading, toggleLike, deleteStory } =
    useCommunityStories(sort)
  const { blockUser } = useBlockedUsers()

  const initialIndex = useMemo(() => {
    const parsed = Number(params.index)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
  }, [params.index])

  const viewedRef = useRef(new Set<string>())
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const formatRemaining = (expiresAt: Date): string => {
    const diffMinutes = Math.floor((expiresAt.getTime() - Date.now()) / 60000)
    if (diffMinutes <= 0) return t("community.stories.expiringSoon")
    if (diffMinutes < 60) {
      return t("community.stories.expiresInMinutes", { count: diffMinutes })
    }
    return t("community.stories.expiresInHours", {
      count: Math.floor(diffMinutes / 60),
    })
  }

  const heartScale = useSharedValue(1)
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const handleToggleLike = (story: CommunityStory) => {
    hapticSelection()
    heartScale.value = withSequence(
      withSpring(1.3, HEART_SPRING),
      withSpring(1, HEART_SPRING),
    )
    toggleLike(story.id)
  }

  const handleViewableChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]
      if (!first || first.index === null) return
      setActiveIndex(first.index)
      const story = first.item as CommunityStory
      if (story && !story.isMine && !viewedRef.current.has(story.id)) {
        viewedRef.current.add(story.id)
        void communityStoryService.recordView(story.id)
      }
    },
    [],
  )

  const handleMore = async (story: CommunityStory) => {
    if (story.isMine) {
      const confirmed = await showConfirm({
        title: t("community.stories.deleteTitle"),
        description: t("community.stories.deleteBody"),
        confirmLabel: t("action.delete"),
        cancelLabel: t("action.cancel"),
        destructive: true,
      })
      if (confirmed) deleteStory(story.id)
      return
    }

    const picked = await showActionSheet({
      title: story.authorName,
      actions: [
        { label: t("community.stories.report") },
        { label: t("community.stories.blockUser"), destructive: true },
      ],
    })
    if (picked === 0) {
      await reportStory(story)
      return
    }
    if (picked !== 1) return

    const confirmed = await showConfirm({
      title: t("community.stories.blockTitle", { name: story.authorName }),
      description: t("community.stories.blockBody"),
      confirmLabel: t("community.stories.block"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (confirmed) blockUser(story.authorName)
  }

  const reportStory = async (story: CommunityStory) => {
    const reasons: { label: string; value: ReportReason }[] = [
      {
        label: t("community.postDetail.reportReasons.spam"),
        value: "SPAM",
      },
      {
        label: t("community.postDetail.reportReasons.harassment"),
        value: "HARASSMENT",
      },
      {
        label: t("community.postDetail.reportReasons.inappropriate"),
        value: "INAPPROPRIATE_CONTENT",
      },
      {
        label: t("community.postDetail.reportReasons.falseInformation"),
        value: "FALSE_INFORMATION",
      },
      {
        label: t("community.postDetail.reportReasons.other"),
        value: "OTHER",
      },
    ]
    const picked = await showActionSheet({
      title: t("community.postDetail.reportReasonTitle"),
      actions: reasons.map((r) => ({ label: r.label })),
    })
    if (picked == null) return

    try {
      await reportService.reportUser({
        targetNickName: story.authorName,
        reason: reasons[picked].value,
      })
      showSuccessToast(
        t("community.postDetail.reportReceivedTitle"),
        t("community.postDetail.reportReceivedBody"),
      )
    } catch (error) {
      // `catch {}` 로 오류를 받지도 않고 있었다 — 이미 신고한 사람이든 만료된
      // 스토리든 화면에는 같은 "인터넷 연결" 한 줄만 떴다.
      presentCommunityError(error, { scope: "community-story-report" })
    }
  }

  const renderStory = ({ item }: { item: CommunityStory }) => (
    <View style={{ width: windowWidth, height: windowHeight }}>
      <Image
        source={{ uri: item.imageUri }}
        style={styles.image}
        contentFit="contain"
      />

      {/* 오른쪽 액션 레일 */}
      <View style={[styles.actionRail, { bottom: insets.bottom + 132 }]}>
        <Pressable
          onPress={() => handleToggleLike(item)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("community.stories.like")}
          accessibilityState={{ selected: item.liked }}
          style={styles.actionItem}
        >
          <Animated.View style={heartStyle}>
            <Ionicons
              name={item.liked ? "heart" : "heart-outline"}
              size={30}
              color={item.liked ? "#FE7139" : "#FFFFFF"}
            />
          </Animated.View>
          <Text style={styles.actionLabel}>
            {item.likes > 0 ? item.likes : t("community.postDetail.like")}
          </Text>
        </Pressable>

        <View style={styles.actionItem}>
          <Ionicons name="eye-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionLabel}>{item.views}</Text>
        </View>

        <Pressable
          onPress={() => handleMore(item)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("community.stories.more")}
          style={styles.actionItem}
        >
          <Ionicons name="ellipsis-horizontal" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 아래 작성자·캡션 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.authorName} numberOfLines={1}>
            {item.isMine ? t("community.stories.mine") : item.authorName}
          </Text>
          <Text style={styles.remaining}>
            {formatRemaining(item.expiresAt)}
          </Text>
        </View>
        {item.caption && (
          <Text
            style={styles.caption}
            numberOfLines={3}
            lineBreakStrategyIOS="hangul-word"
          >
            {item.caption}
          </Text>
        )}
      </View>
    </View>
  )

  return (
    <View style={styles.screen}>
      {isLoading && stories.length === 0 ? (
        // 검은 배경 위 전체화면 사진 한 장이 올 자리. 링 대신 점으로 조용히 기다린다.
        <View style={styles.centered}>
          <V2DotLoader size="m" color="#FFFFFF" />
        </View>
      ) : stories.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>
            {t("community.stories.emptyTitle")}
          </Text>
          <Text style={styles.emptySub}>
            {t("community.stories.emptyBody")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={renderStory}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, stories.length - 1)}
          getItemLayout={(_, index) => ({
            length: windowHeight,
            offset: windowHeight * index,
            index,
          })}
          onViewableItemsChanged={handleViewableChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
        />
      )}

      {/* 상단 바 — 이미지 위에 떠 있다. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>

        <View style={styles.sortTabs}>
          {SORTS.map((item) => {
            const selected = sort === item
            return (
              <Pressable
                key={item}
                onPress={() => {
                  if (selected) return
                  hapticSelection()
                  setSort(item)
                  viewedRef.current.clear()
                  setActiveIndex(0)
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.sortLabel, selected && styles.sortLabelActive]}
                >
                  {item === "recommended"
                    ? t("community.stories.recommended")
                    : t("community.stories.recent")}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Pressable
          onPress={() => router.push("/story/new" as Href)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("community.stories.add")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 진행 표시 — 몇 번째를 보고 있는지. */}
      {stories.length > 1 && (
        <View style={[styles.progressRow, { bottom: insets.bottom + 12 }]}>
          {stories.slice(0, 12).map((story, index) => (
            <View
              key={story.id}
              style={[
                styles.progressDot,
                index === activeIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0B0D",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
    color: "rgba(255,255,255,0.62)",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sortLabel: {
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.31,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
    color: "rgba(255,255,255,0.55)",
  },
  sortLabelActive: {
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },

  actionRail: {
    position: "absolute",
    right: 16,
    alignItems: "center",
    gap: 22,
  },
  actionItem: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
    color: "#FFFFFF",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 72,
    bottom: 0,
    paddingHorizontal: 20,
    gap: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  authorName: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },
  remaining: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
    color: "rgba(255,255,255,0.6)",
  },
  caption: {
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: -0.29,
    fontFamily: "Pretendard-Regular",
    color: "rgba(255,255,255,0.92)",
  },

  progressRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  progressDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressDotActive: {
    backgroundColor: "#FFFFFF",
  },
})

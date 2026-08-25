import { useCallback, useMemo, useRef, useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
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
import { resolveError } from "@/src/lib/errorMessage"
import { hapticSelection } from "@/src/lib/haptics"
import { MOTION } from "@/src/theme/surface"
import {
  isStoryExpired,
  resolveStoryIndex,
  storyMinutesLeft,
  useCommunityStories,
  useStableStoryOrder,
  useStoryNow,
} from "@/src/features/recipe/hooks/useCommunityStories"
import {
  isAuthorBlocked,
  useBlockedUsers,
} from "@/src/features/recipe/hooks/useBlockedUsers"
import { isWithdrawnAuthor } from "@/src/features/recipe/utils/contentOwnership"
import { resolveShownIndex } from "@/src/features/recipe/utils/storyProgress"
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
import { ModalOverlayHost } from "@/src/shared/components"

const HEART_SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }
const SORTS: StorySort[] = ["recommended", "recent"]

export default function StoriesScreen() {
  const { t } = useTranslation()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const { height: windowHeight, width: windowWidth } = useWindowDimensions()
  /*
    **자리 번호가 아니라 id 로 연다.** 추천 정렬은 서버가 매번 새로 섞어 주므로
    (`ORDER BY random()`), 레일이 넘긴 `index=2` 는 재조회가 한 번 돌면 다른 사람의
    스토리를 가리킨다 — 훅 머리말 "뷰어가 보는 순서" 에 그 경로가 적혀 있다.
  */
  const params = useLocalSearchParams<{ storyId?: string; sort?: string }>()

  const [sort, setSort] = useState<StorySort>(
    params.sort === "recent" ? "recent" : "recommended",
  )
  const {
    stories,
    isLoading,
    isError,
    error,
    refetch,
    toggleLike,
    deleteStory,
  } = useCommunityStories(sort)
  const { blockedAuthors, blockUser } = useBlockedUsers()
  const failure = resolveError(error)
  /** 분마다 갱신되는 "지금". 카운트다운과 만료 판정이 같은 값을 본다. */
  const now = useStoryNow()

  /*
    화면에 남을 것만 남긴다.

     - **만료**: 서버가 지우기 전에도 내린다. 남겨 두면 "곧 사라져요" 를 영원히 말하는
       사진이 서 있고, 좋아요를 누르면 `COMMUNITY_ERROR_012` 로 조용히 되돌아간다.
     - **차단**: 서버도 거르지만 그 응답이 오기 전 한 박자를 여기서 메운다 —
       차단하자마자 그 사람의 스토리가 앞에서 사라지지 않으면 버튼이 안 먹은 것으로
       읽힌다(`FreePostTab` 의 피드 필터와 같은 처방).
  */
  const liveStories = useMemo(
    () =>
      stories.filter(
        (story) =>
          !isStoryExpired(story, now) &&
          (isWithdrawnAuthor(story) || !isAuthorBlocked(blockedAuthors, story)),
      ),
    [stories, now, blockedAuthors],
  )
  /* 재조회가 새 셔플을 들고 와도 보던 순서는 그대로 — 손가락 아래가 안 바뀐다. */
  const visibleStories = useStableStoryOrder(liveStories)

  const initialIndex = useMemo(
    () => resolveStoryIndex(visibleStories, params.storyId),
    [visibleStories, params.storyId],
  )

  const viewedRef = useRef(new Set<string>())
  /*
    ─── 보고 있는 것은 **자리가 아니라 스토리**다 (2026-08-21) ─────────────────
    여기는 자리 번호(`activeIndex`)를 들고 있었다. 그런데 이 목록은 손가락 아래에서
    **줄어든다**: 분 눈금이 지나면 만료된 것이 빠지고(`liveStories`), 차단하면 그 사람
    것이 통째로 빠진다. 앞쪽에서 둘이 빠지면 4번을 보고 있던 사람의 번호는 그대로 4인데
    목록은 2개뿐이라 진행 점이 **아무 데도 안 붙는다**. `VirtualizedList` 는 한 프레임
    안에 스스로 offset 을 되잡지만, 그 자리는 "잘린 위치" 일 뿐 손가락 아래 있던 그
    스토리가 아니다 — `stableStoryOrder` 의 보장은 **재배열**에 대한 것이지 앞쪽 제거에
    대한 것이 아니다.

    그래서 id 를 들고 있는다. 사라진 뒤에는 마지막으로 알던 번호를 목록 안으로 접어
    (clamp) 그 자리를 그린다 — 화면이 실제로 앉는 자리와 같다. 열 때 넘어온 자리는
    `initialIndex` 가 그대로 맡는다(`null` 이 "아직 첫 보임 콜백이 안 왔다").
  */
  const [active, setActive] = useState<{ id: string; index: number } | null>(
    null,
  )
  const shownIndex = resolveShownIndex(
    visibleStories,
    active?.id ?? null,
    active?.index ?? initialIndex,
  )
  const formatRemaining = (expiresAt: Date): string => {
    const minutes = storyMinutesLeft(expiresAt, now)
    // 만료된 것은 위에서 이미 걸러졌다 — 여기 0 은 "1분도 안 남았다" 는 뜻이다.
    if (minutes <= 0) return t("community.stories.expiringSoon")
    if (minutes < 60) {
      return t("community.stories.expiresInMinutes", { count: minutes })
    }
    return t("community.stories.expiresInHours", {
      count: Math.floor(minutes / 60),
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
      const story = first.item as CommunityStory
      if (!story) return
      // **신원과 번호를 한 벌로** 잡는다 — 번호는 목록이 줄면 뜻을 잃지만 id 는 안 그렇다.
      setActive({ id: story.id, index: first.index })
      if (!story.isMine && !viewedRef.current.has(story.id)) {
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
        source={remoteImageSource(item.imageUri)}
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
          <Text style={styles.actionLabel} lineBreakStrategyIOS="hangul-word">
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
      ) : isError && stories.length === 0 ? (
        /*
          실패를 "아직 스토리가 없어요" 로 말하던 자리. 비행기 모드에서도 점 세 개가
          3초쯤 돌다가 빈 상태 문구가 떴고, 사용자에게 남는 할 일이 없었다 —
          닫는 것 말고는. 원인과 할 일은 카탈로그가 안다(`resolveError`).
        */
        <View style={styles.centered}>
          <Text style={styles.emptyTitle} lineBreakStrategyIOS="hangul-word">
            {failure.title}
          </Text>
          <Text style={styles.emptySub} lineBreakStrategyIOS="hangul-word">
            {failure.body}
          </Text>
          {/* 다시 해서 될 때만 그린다 — 눌러도 안 되는 버튼은 안내가 아니다. */}
          {failure.retryable && (
            <Pressable
              onPress={() => void refetch()}
              hitSlop={10}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.emptyTitle, styles.retryLabel]}>
                {t("action.retry")}
              </Text>
            </Pressable>
          )}
        </View>
      ) : visibleStories.length === 0 ? (
        /* 만료·차단으로 다 걸러진 경우도 여기로 온다 — 지금 볼 것이 없다는 말은 같다. */
        <View style={styles.centered}>
          <Text style={styles.emptyTitle} lineBreakStrategyIOS="hangul-word">
            {t("community.stories.emptyTitle")}
          </Text>
          <Text style={styles.emptySub} lineBreakStrategyIOS="hangul-word">
            {t("community.stories.emptyBody")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleStories}
          keyExtractor={(item) => item.id}
          renderItem={renderStory}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, visibleStories.length - 1)}
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
                  // 정렬을 갈면 목록이 통째로 바뀐다 — 옛 신원도 옛 번호도 뜻이 없다.
                  setActive(null)
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.sortLabel, selected && styles.sortLabelActive]}
                  lineBreakStrategyIOS="hangul-word"
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

      {/* 진행 표시 — 몇 번째를 보고 있는지.
          점 스택을 **세로**로, 왼쪽 가장자리 세로 중앙에 둔다. 예전의 하단 가로
          점 줄은 "좌우로 넘기는 캐러셀"로 읽혔는데 실제 내비게이션은 릴스식
          세로 페이징이라 어긋났다(QA 2026-08-06). 인디케이터가 이동 축과 같은
          방향으로 쌓여 있으면 그 자체가 "위아래로 넘긴다"는 안내가 된다.
          현재 위치는 세로로 긴 필 — 축을 한 번 더 말한다.

          **자리는 `resolveShownIndex` 가 정한다** — 보던 스토리가 만료·차단으로 목록에서
          빠져도 점 하나는 반드시 켜지고, 그 점은 화면이 실제로 앉는 자리를 가리킨다
          (옛 코드는 `activeIndex` 를 그대로 써서 목록이 줄면 아무 점도 안 켜졌다). */}
      {visibleStories.length > 1 && (
        <View style={styles.progressCol} pointerEvents="none">
          {visibleStories.slice(0, 12).map((story, index) => (
            <View
              key={story.id}
              style={[
                styles.progressDot,
                index === Math.min(shownIndex, 11) && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/*
        이 화면은 `presentation: "fullScreenModal"`(app/_layout.tsx) 이라 iOS 에서
        **네이티브 뷰컨트롤러로 present 된다.** 그 상태에서 `showActionSheet`(⋯ → 신고)
        가 루트의 `V2DialogHost` 로 가면 루트 VC 는 이미 present 중이라 시트의 RN Modal
        present 를 **조용히 거부한다** — 사용자에게는 "눌러도 아무것도 안 뜨거나 화면
        뒤에서 열린다" 로 보였다. 호스트는 스택이라(lib/dialog: `hosts`) 여기 하나 더
        얹으면 이 화면의 VC 위에서 뜬다. 토스트도 같은 이유로 함께 온다(신고 접수 토스트).
      */}
      <ModalOverlayHost />
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
  retryButton: {
    marginTop: 10,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  /* 색은 `emptyTitle` 에서 받는다 — 같은 흰색 리터럴을 한 벌 더 만들지 않는다. */
  retryLabel: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
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
    gap: 12,
  },
  actionItem: {
    minWidth: 48,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(11,11,13,0.62)",
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

  progressCol: {
    position: "absolute",
    left: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  progressDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  progressDotActive: {
    height: 16,
    backgroundColor: "#FFFFFF",
  },
})

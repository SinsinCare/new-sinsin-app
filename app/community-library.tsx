import { useCallback, useMemo, useState } from "react"
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { PostListItem } from "@/src/features/recipe/components/PostListItem"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { useBlockedUsers } from "@/src/features/recipe/hooks/useBlockedUsers"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { useTranslation } from "react-i18next"

const TABS = ["mine", "liked", "bookmarked"] as const

/** 목록 줄 사이 간격 — 예전 listWrap 의 gap(10)을 분리자로 옮겼다. */
function ListGap() {
  return <View style={styles.listGap} />
}

type LibraryTab = (typeof TABS)[number]

/**
 * 내 활동 보관함 — 쓴 글·좋아요·북마크를 세그먼트 하나로 오간다.
 * 피드가 전량 로드되므로 서버 왕복 없이 플래그(liked/bookmarked/작성자)로 거른다.
 */
export default function CommunityLibraryScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const surface = useSurface()
  const params = useLocalSearchParams<{ tab?: string }>()

  const initialTab: LibraryTab = TABS.some((tab) => tab === params.tab)
    ? (params.tab as LibraryTab)
    : "mine"
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab)
  const [refreshing, setRefreshing] = useState(false)

  const { posts, refetch } = useCommunityPosts()
  const { blockedNickNames, blockUser } = useBlockedUsers()
  const { data: profile } = useMyPageProfile()
  const myNickName = profile?.nickName ?? null

  const visiblePosts = useMemo(
    () => posts.filter((p) => !blockedNickNames.includes(p.authorName)),
    [posts, blockedNickNames],
  )

  const listsByTab = useMemo<Record<LibraryTab, typeof visiblePosts>>(
    () => ({
      mine: myNickName
        ? visiblePosts.filter((p) => p.authorName === myNickName)
        : [],
      liked: visiblePosts.filter((p) => p.liked),
      bookmarked: visiblePosts.filter((p) => p.bookmarked),
    }),
    [visiblePosts, myNickName],
  )

  const activePosts = listsByTab[activeTab]
  const emptyCopy = {
    title: t(`community.library.empty.${activeTab}.title`),
    sub: t(`community.library.empty.${activeTab}.body`),
  }
  const categoryLabel = (key: string) => {
    switch (key) {
      case "diet":
        return t("community.categories.diet")
      case "numbers":
        return t("community.categories.numbers")
      case "symptoms":
        return t("community.categories.symptoms")
      case "medicine":
        return t("community.categories.medicine")
      case "dining-out":
        return t("community.categories.diningOut")
      case "daily":
        return t("community.categories.daily")
      default:
        return key
    }
  }

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch, refreshing])

  const handleTagPress = useCallback(
    (tag: string) => {
      router.push({ pathname: "/community", params: { tag } } as Href)
    },
    [router],
  )

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
      {/* 앱바 */}
      <View style={styles.appBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <Text
          style={[styles.appBarTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("community.myActivity")}
        </Text>
        <View style={styles.appBarSpacer} />
      </View>

      {/* 세그먼트 */}
      <View style={styles.segmentWrap}>
        <View
          style={[
            styles.segmentTrack,
            {
              backgroundColor: surface.isDark
                ? surface.surface
                : surface.surfacePressed,
            },
          ]}
        >
          {TABS.map((tab) => {
            const selected = tab === activeTab
            const count = listsByTab[tab].length
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  hapticSelection()
                  setActiveTab(tab)
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.segmentItem,
                  selected && {
                    backgroundColor: surface.isDark ? "#3A3A40" : surface.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    selected
                      ? [
                          styles.segmentLabelSelected,
                          { color: surface.textStrong },
                        ]
                      : { color: surface.textMuted },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t(`community.library.tabs.${tab}`)}
                  {count > 0 ? ` ${count}` : ""}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* 예전 ScrollView + map — 가상화가 없어 보관함이 클수록 전 항목이 마운트됐다. */}
      <FlashList
        data={activePosts}
        renderItem={({ item: post }) => (
          <View style={styles.listItemWrap}>
            <PostListItem
              category={categoryLabel(post.category)}
              createdAt={post.createdAt}
              title={post.title}
              summary={post.description}
              imageUri={post.imageUris[0] ?? post.imageUri}
              authorName={post.authorName}
              likeCount={post.likes}
              commentCount={post.comments}
              tags={post.tags}
              onPress={() => router.push(`/post/${post.id}` as Href)}
              onPressTag={handleTagPress}
              onBlock={blockUser}
              isWithdrawnAuthor={post.authorId === null}
              isMine={myNickName != null && post.authorName === myNickName}
            />
          </View>
        )}
        keyExtractor={(post) => `${activeTab}-${post.id}`}
        ItemSeparatorComponent={ListGap}
        ListHeaderComponent={<View style={styles.listTopGap} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: surface.textStrong }]}>
              {emptyCopy.title}
            </Text>
            <Text style={[styles.emptySub, { color: surface.textMuted }]}>
              {emptyCopy.sub}
            </Text>
          </View>
        }
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={surface.textMuted}
            colors={[surface.brand]}
            progressBackgroundColor={surface.isDark ? surface.card : "#FFFFFF"}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  appBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appBarTitle: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  appBarSpacer: {
    width: 24,
  },

  segmentWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  segmentLabelSelected: {
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  listItemWrap: {
    paddingHorizontal: 20,
  },
  listGap: {
    height: 10,
  },
  listTopGap: {
    height: 12,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 64,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
  },
})

import { useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { useAppRouter } from "@/src/shared/navigation"
import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { afterModalTransitions } from "@/src/shared/components/AppModal"
import { showConfirm } from "@/src/lib/dialog"
import { resolveError } from "@/src/lib/errorMessage"
import { ArticleSkeleton, ErrorMessage } from "@/src/shared/components"
import { useCommunityAuthor } from "../hooks/useCommunityAuthor"
import { useCommunityPosts } from "../hooks/useCommunityPosts"
import { PostListItem } from "../components/PostListItem"
import { useBlockedUsers } from "../hooks/useBlockedUsers"
import { formatCount } from "../utils/displayNumber"
import type { CommunityMealPost } from "../types"

const CATEGORY_LABEL_KEYS = {
  diet: "community.categories.diet",
  numbers: "community.categories.numbers",
  symptoms: "community.categories.symptoms",
  medicine: "community.categories.medicine",
  "dining-out": "community.categories.diningOut",
  daily: "community.categories.daily",
} as const

export function CommunityAuthorProfileScreen() {
  const { t, i18n } = useTranslation("common")
  const router = useAppRouter()
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id?: string }>()
  const authorId = Number(params.id)
  const hasValidAuthorId = Number.isInteger(authorId) && authorId > 0
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    setFollowing,
    isFollowingPending,
  } = useCommunityAuthor(authorId)
  /*
    이 화면에 피드 훅이 있는 이유는 "다른 글" 후보뿐이다. 기본값(`observe:true`)으로
    두면 **마운트할 때마다 로드된 피드 페이지 전부를 다시 받는다** — 열 페이지를
    스크롤하다 들어온 사람은 프로필 한 번에 열 번의 요청을 낸다.
    `"cold-only"` 는 캐시가 아예 없을 때만 첫 장 하나를 받는다(그 훅 머리말).
  */
  const { posts } = useCommunityPosts({ observe: "cold-only" })
  const { blockUserAsync } = useBlockedUsers()

  const authorPosts = useMemo(
    () => posts.filter((post) => post.authorId === authorId),
    [authorId, posts],
  )

  const categoryLabel = (key: string) => {
    const labelKey =
      CATEGORY_LABEL_KEYS[key as keyof typeof CATEGORY_LABEL_KEYS]
    return labelKey ? t(labelKey) : key
  }

  const renderPost = ({ item }: { item: CommunityMealPost }) => (
    <View style={styles.postWrap}>
      <PostListItem
        postId={item.id}
        category={categoryLabel(item.category)}
        createdAt={item.createdAt}
        title={item.title}
        summary={item.description}
        imageUri={item.imageUri}
        authorName={item.authorName}
        likeCount={item.likes}
        commentCount={item.comments}
        viewCount={item.views ?? 0}
        tags={item.tags}
        onPress={() => router.push(`/post/${item.id}` as Href)}
        isMine={item.isMine ?? false}
      />
    </View>
  )

  /*
    깨진 딥링크(`/community/author/abc`)는 `NaN` 이라 쿼리가 `enabled:false` 로
    조용히 멈춘다. 예전에는 그것이 로딩 갈래에 섞여 있어 **스켈레톤이 영원히**
    돌았다 — 느린 게 아니라 주소가 가리키는 사람이 없는 것이다. 여기는 다시
    물어도 답이 같으므로 재시도를 그리지 않는다.
  */
  if (!hasValidAuthorId) {
    return (
      <View
        style={[
          styles.screen,
          styles.center,
          { backgroundColor: surface.canvas, paddingTop: insets.top },
        ]}
      >
        <ErrorMessage
          title={t("community.author.notFound")}
          message={t("notFound.description")}
        />
      </View>
    )
  }

  if (isLoading || (!profile && !isError)) {
    return (
      <View style={[styles.screen, { backgroundColor: surface.canvas }]}>
        <ArticleSkeleton />
      </View>
    )
  }

  if (isError || !profile) {
    /*
      오프라인·500·429·진짜 404 가 전부 "이 작성자를 찾지 못했어요" 로 나오고
      재시도 버튼은 **항상** 그려졌다. 진짜 404 에서는 눌러도 되지 않는 버튼이고,
      오프라인에서는 원인을 숨기는 문장이다. 원인과 할 일은 카탈로그가 안다.
    */
    const failure = resolveError(error)
    return (
      <View
        style={[
          styles.screen,
          styles.center,
          { backgroundColor: surface.canvas, paddingTop: insets.top },
        ]}
      >
        <ErrorMessage
          title={failure.title}
          message={failure.body ?? ""}
          onRetry={failure.retryable ? () => void refetch() : undefined}
          retryLabel={t("action.retry")}
        />
      </View>
    )
  }

  const handleBlock = async () => {
    if (profile.isMine) return
    const confirmed = await showConfirm({
      title: t("community.stories.blockTitle", { name: profile.nickName }),
      description: t("community.stories.blockBody"),
      confirmLabel: t("community.stories.block"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return
    /*
      예전에는 `blockUser(...)` 를 쏘고 곧바로 화면을 떠났다. 오프라인이거나
      신고/차단 제한(60회/10분)에 걸리면 아무 말도 없이 되돌아가고, 사용자는
      차단이 된 줄 안다 — 차단은 안전 동작이라 그 착각이 가장 비싸다.
      실패는 훅의 `onError` 가 말하고, 여기서는 **떠나지 않는 것**으로 답한다.
    */
    try {
      await blockUserAsync(profile.nickName)
    } catch {
      return
    }
    await afterModalTransitions()
    router.back()
  }

  const header = (
    <>
      <View style={[styles.appBar, { borderBottomColor: surface.hairline }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <Text
          style={[styles.appBarTitle, { color: surface.textStrong }]}
          numberOfLines={1}
        >
          {profile.nickName}
        </Text>
        <Pressable
          onPress={() => void handleBlock()}
          disabled={profile.isMine}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={profile.isMine ? undefined : profile.nickName}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={profile.isMine ? "transparent" : surface.text}
          />
        </Pressable>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: surface.surface }]}>
            {profile.profileImageUrl ? (
              <Image
                source={{ uri: profile.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={28} color={surface.text} />
            )}
          </View>
          <View style={styles.identity}>
            <Text style={[styles.name, { color: surface.textStrong }]}>
              {profile.nickName}
            </Text>
            {/*
              **게시글 수는 여기서 뺐다.** 서버가 주는 진짜 총합(예: 30)인데, 그
              숫자를 받쳐 줄 목록이 이 화면에 없다 — 아래 "다른 글" 은 작성자별
              엔드포인트가 아니라 **이미 로드된 전역 피드 캐시**를 거른 것이라,
              콜드 스타트에서는 최근 한 장에서 이 사람 글만 남는다(대개 0개).
              "게시글 30" 바로 밑에 빈 목록이 오는 화면이 그렇게 만들어졌다.
              팔로워·팔로잉은 전용 목록 엔드포인트가 있어 눌러서 확인되므로 남긴다.
              작성자 글 목록 API 가 생기면 이 칸을 그때 되살린다.
            */}
            <View style={styles.stats}>
              <Pressable
                onPress={() =>
                  router.push(
                    `/community/connections?id=${authorId}&mode=followers` as Href,
                  )
                }
                style={styles.stat}
              >
                <Text
                  style={[styles.statNumber, { color: surface.textStrong }]}
                >
                  {formatCount(profile.followerCount, i18n.language)}
                </Text>
                <Text style={[styles.statLabel, { color: surface.text }]}>
                  {t("community.author.followers")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push(
                    `/community/connections?id=${authorId}&mode=following` as Href,
                  )
                }
                style={styles.stat}
              >
                <Text
                  style={[styles.statNumber, { color: surface.textStrong }]}
                >
                  {formatCount(profile.followingCount, i18n.language)}
                </Text>
                <Text style={[styles.statLabel, { color: surface.text }]}>
                  {t("community.author.following")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {profile.badges.length > 0 && (
          <View style={styles.badges}>
            {profile.badges.map((badge) => (
              <View
                key={badge}
                style={[styles.badge, { backgroundColor: surface.surface }]}
              >
                <Text style={[styles.badgeText, { color: surface.text }]}>
                  {badge}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!profile.isMine && (
          <SurfacePressable
            onPress={() => setFollowing(!profile.isFollowing)}
            disabled={isFollowingPending}
            accessibilityState={{ selected: profile.isFollowing }}
            baseColor={
              profile.isFollowing ? surface.brand : surface.surfaceBrand
            }
            pressScale={0.98}
            style={styles.followButton}
          >
            <Text
              style={[
                styles.followText,
                {
                  color: profile.isFollowing ? surface.onBrand : surface.brand,
                },
              ]}
            >
              {t(
                profile.isFollowing
                  ? "community.author.unfollow"
                  : "community.author.follow",
              )}
            </Text>
          </SurfacePressable>
        )}
      </View>

      {/*
        이 섹션은 "**지금 로드된 피드 안에서** 이 사람이 쓴 글" 이다. 그래서 글이
        하나도 안 잡히면 머리말도 같이 접는다 — 예전에는 머리말을 그려 놓고 그
        아래에 "아직 작성한 게시글이 없어요" 를 띄웠는데, 그건 "이 사람은 글을 안
        썼다" 는 말이라 **우리가 안 받아 온 것**과 다른 사실이다. 없는 것을 말하지
        않는 쪽이 틀린 것을 말하는 쪽보다 낫다(`app/community-library.tsx` 와 같은
        한계이고, 해소는 작성자 글 목록 API 몫이다).
      */}
      {authorPosts.length > 0 && (
        <View
          style={[
            styles.postsHeading,
            {
              borderTopColor: surface.hairline,
              borderBottomColor: surface.hairline,
            },
          ]}
        >
          <Text
            style={[styles.postsHeadingText, { color: surface.textStrong }]}
          >
            {t("community.author.otherPosts", { name: profile.nickName })}
          </Text>
        </View>
      )}
    </>
  )

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      <FlashList
        data={authorPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: "center", paddingHorizontal: 24 },
  appBar: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appBarTitle: {
    maxWidth: 220,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  profileSection: { padding: 20, gap: 14 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  identity: { flex: 1, gap: 9 },
  name: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  stats: { flexDirection: "row", alignItems: "center", gap: 22 },
  stat: { alignItems: "flex-start" },
  statNumber: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: "Pretendard-Regular",
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 9,
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, lineHeight: 15, fontFamily: "Pretendard-Medium" },
  followButton: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  followText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  postsHeading: {
    minHeight: 54,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postsHeadingText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  postWrap: { paddingHorizontal: 20 },
  gap: { height: 10 },
})

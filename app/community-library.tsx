import { useCallback, useMemo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { LAYOUT } from "@/src/theme/surface"
import { FlashList } from "@shopify/flash-list"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { resolveError } from "@/src/lib/errorMessage"
import {
  V2EmptyState,
  V2ErrorState,
  V2Skeleton,
  V2SkeletonGroup,
  type V2ErrorStateRetry,
} from "@/src/design-system-v2"
import { PostListItem } from "@/src/features/recipe/components/PostListItem"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import {
  isAuthorBlocked,
  useBlockedUsers,
} from "@/src/features/recipe/hooks/useBlockedUsers"
import { COMMUNITY_LIBRARY_REFRESH } from "@/src/features/recipe/refresh/scopes"
import { useRefreshable, useRevalidateOnReturn } from "@/src/shared/refresh"
import {
  isMyContent,
  isWithdrawnAuthor,
} from "@/src/features/recipe/utils/contentOwnership"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { useTranslation } from "react-i18next"

const TABS = ["mine", "liked", "bookmarked"] as const

/** 목록 줄 사이 간격 — 예전 listWrap 의 gap(10)을 분리자로 옮겼다. */
function ListGap() {
  return <View style={styles.listGap} />
}

type LibraryTab = (typeof TABS)[number]

/**
 * `V2EmptyState` 의 액션은 라벨과 콜백이 **함께** 있을 때만 그려진다. 삼항을 그대로
 * 스프레드하면 옵셔널이 `string | undefined` 로 넓어져 유니온이 무너진다
 * (`V2ErrorStateRetry` 와 같은 이유).
 */
type LibraryEmptyAction =
  | { actionLabel: string; onAction: () => void }
  | { actionLabel?: undefined; onAction?: undefined }

/**
 * 내 활동 보관함 — 쓴 글·좋아요·북마크를 세그먼트 하나로 오간다.
 *
 * 피드가 커서 페이지로 바뀌어 지금은 **로드된 페이지 안에서** 플래그
 * (liked/bookmarked/작성자)로 거른다 — 아직 안 받은 페이지의 글은 여기 안 보인다.
 * 전용 서버 목록(내 글·좋아요·북마크 API)은 P1 몫이다.
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

  /*
    로딩·실패를 함께 꺼낸다. 예전에는 `posts` 만 꺼내 무조건 "아직 쓴 글이 없어요" 를
    그렸다 — 비행기 모드에서 커뮤니티 탭을 열고(피드는 정직하게 오류를 그린다) 헤더의
    "내 활동" 을 누르면 **같은 오류 쿼리**에 붙어 세 탭 전부가 "없어요" 였다.
    사용자 자기 콘텐츠에 대한 거짓 진술이라, 목록 세 화면(R5)과 같은 3분기를 쓴다.
  */
  const { posts, isLoading, isError, error, refetch } = useCommunityPosts()
  const { blockedAuthors, blockUser } = useBlockedUsers()
  const { data: profile } = useMyPageProfile()
  const myNickName = profile?.nickName ?? null

  /*
    피드·검색·인기·스토리와 **같은 식**이다 — 탈퇴 글쓴이는 차단 필터에서 면제한다
    (2026-08-21에 맞췄다). 여기만 면제가 빠져 있었고, 그 차이는 `탈퇴한 사용자` 라는
    **라벨**이 `unresolvedNames` 축에 앉는 순간 드러난다: 누군가 그 이름을 차단했거나
    서버가 `blocked_user_id` 를 못 풀면(지금 프로덕션 파이썬 서버에는 그 칸이 없어
    **모든 행**이 이름 축이다) 탈퇴자 전원이 한 사람 취급된다. 그러면 같은 글이
    피드에는 보이고 보관함에서는 사라진다 — 한 사람이 두 답을 듣는다.
  */
  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (p) => isWithdrawnAuthor(p) || !isAuthorBlocked(blockedAuthors, p),
      ),
    [posts, blockedAuthors],
  )

  const listsByTab = useMemo<Record<LibraryTab, typeof visiblePosts>>(
    () => ({
      mine: visiblePosts.filter((p) => isMyContent(p, myNickName)),
      liked: visiblePosts.filter((p) => p.liked),
      bookmarked: visiblePosts.filter((p) => p.bookmarked),
    }),
    [visiblePosts, myNickName],
  )

  const activePosts = listsByTab[activeTab]
  /*
    한 덩어리다 — 이유 한 줄 + 이 탭이 무엇을 모으는지 한 줄. `V2EmptyState` 의
    `description` 은 가운데정렬 한 칸이라 `\n` 으로 잇는다(`CommentEmptyState` 선례).
  */
  const emptyDescription = `${t(
    `community.library.empty.${activeTab}.title`,
  )}\n${t(`community.library.empty.${activeTab}.body`)}`
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

  const refreshable = useRefreshable({
    queryKeys: COMMUNITY_LIBRARY_REFRESH,
    scope: "community-library",
  })
  useRevalidateOnReturn({ queryKeys: COMMUNITY_LIBRARY_REFRESH })

  const handleTagPress = useCallback(
    (tag: string) => {
      /*
        **`push` 가 아니다.** `(tabs)` 는 루트 Stack 의 화면 하나이고, 이 화면은 그
        Stack 위에 얹혀 있다. 그래서 expo-router 55 는 `/community` 로 가는 길이
        **루트에서 갈라진다**고 보고 `StackActions.push("(tabs)")` 를 쏜다 — 탭
        네비게이터가 통째로 한 벌 더 쌓인다. 글 → 태그 → 글 → 태그를 반복하면
        탭 바가 세 겹이 되고, 커뮤니티 탭 버튼이 먹지 않으며, 안드로이드는 뒤로가기를
        그 횟수만큼 눌러야 나간다.
        `navigate` 도 같다 — react-navigation 의 StackRouter 는 NAVIGATE 에서
        **지금 떠 있는 화면과 이름이 같을 때만** 기존 라우트를 재사용하고, 아니면
        그대로 밀어 넣는다(`@react-navigation/routers/StackRouter` NAVIGATE 갈래).
        `dismissTo`(POP_TO)만이 스택을 뒤로 훑어 이미 있는 `(tabs)` 로 되돌아간다.
      */
      router.dismissTo({ pathname: "/community", params: { tag } } as Href)
    },
    [router],
  )

  /*
    좋아요·북마크 탭의 탈출구 — 읽을 글이 있는 피드로 되돌린다(읽기가 쓰기보다 먼저다).
    `쓴 글` 탭에는 없다: 거기서 줄 수 있는 링크는 글쓰기뿐이라 조르는 말이 된다.
    `push` 가 아니라 `dismissTo` 인 이유는 `handleTagPress` 머리말 그대로다 —
    `push` 는 탭 네비게이터를 통째로 한 벌 더 쌓는다.
  */
  const browseAction: LibraryEmptyAction =
    activeTab === "mine"
      ? {}
      : {
          actionLabel: t("community.library.empty.browse"),
          onAction: () => router.dismissTo({ pathname: "/community" } as Href),
        }

  const showSkeleton = isLoading && posts.length === 0
  const showError = isError && posts.length === 0
  const failure = resolveError(error)
  // 타입을 붙여야 삼항의 두 갈래가 유니온으로 남는다(`V2ErrorStateRetry` 머리말).
  const retry: V2ErrorStateRetry = failure.retryable
    ? { onRetry: () => void refetch(), retryLabel: t("action.retry") }
    : {}

  const listEmpty = showSkeleton ? (
    /* 목록 자리 스켈레톤 — 카드가 온다는 것을 미리 말한다(링 스피너 금지). */
    <View style={styles.stateWrap}>
      <V2SkeletonGroup>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.skeletonItem}>
            <V2Skeleton width="100%" height={104} radius="xl" />
          </View>
        ))}
      </V2SkeletonGroup>
    </View>
  ) : showError ? (
    <V2ErrorState
      surface="community_library"
      tone="quiet"
      title={failure.title}
      description={failure.body}
      style={styles.stateWrap}
      {...retry}
    />
  ) : (
    /*
      ─── 세 탭의 빈칸은 **행동을 조르지 않는다** (2026-08-21) ────────────────────
      셋 다 "첫 글을 남겨 보세요" · "좋아요를 눌러 보세요" · "북마크해 보세요" 로
      끝났다. 뒤의 둘은 **순환**이다 — 좋아요를 누르려면 먼저 읽을 글을 찾아야 하는데,
      이 화면에는 글이 하나도 없다. 그래서 문장은 "이 탭이 무엇을 모으는가" 로 바꾸고,
      **읽을 자리로 돌아가는 컨트롤**을 좋아요·북마크 두 탭에 붙인다(읽기가 쓰기보다
      먼저다). `쓴 글` 탭에는 안 붙인다 — 거기서 줄 수 있는 유일한 링크가 글쓰기이고,
      그건 이 화면이 조를 일이 아니다(커뮤니티 탭에 이미 떠 있는 버튼이다).

      손으로 두 줄을 그리던 자리다 → `V2EmptyState tone="quiet"`. 손으로 만들면 화면은
      멀쩡한데 `empty_state_viewed` 가 아무것도 안 나간다(**D15**).

      ⚠ **이 화면은 "없다" 를 증명할 수 없다.** 목록은 로드된 피드 페이지를 플래그로
      거른 것이라(위 머리말), 안 받아 온 페이지의 내 글·좋아요는 여기 안 잡힌다.
      문구는 그대로 두되 — 하나도 못 찾은 화면에서 할 수 있는 가장 정직한 말이고,
      매번 "못 찾았을 수도 있어요" 로 흐리면 정상 경로가 전부 모호해진다 — 진짜
      해소는 전용 서버 목록(내 글·좋아요·북마크 API, P1)이다.
    */
    <V2EmptyState
      surface="community_library"
      tone="quiet"
      description={emptyDescription}
      style={styles.stateWrap}
      {...browseAction}
    />
  )

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: surface.bed,
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
              postId={post.id}
              category={categoryLabel(post.category)}
              createdAt={post.createdAt}
              title={post.title}
              summary={post.description}
              imageUri={post.imageUris[0] ?? post.imageUri}
              authorName={post.authorName}
              likeCount={post.likes}
              commentCount={post.comments}
              viewCount={post.views ?? 0}
              tags={post.tags}
              onPress={() => router.push(`/post/${post.id}` as Href)}
              onPressTag={handleTagPress}
              onBlock={blockUser}
              isWithdrawnAuthor={isWithdrawnAuthor(post)}
              isMine={isMyContent(post, myNickName)}
            />
          </View>
        )}
        keyExtractor={(post) => `${activeTab}-${post.id}`}
        ItemSeparatorComponent={ListGap}
        ListHeaderComponent={<View style={styles.listTopGap} />}
        ListEmptyComponent={listEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        {...refreshable.scrollProps}
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
    // 세그먼트와 목록 사이. 고정 머리 ↔ 스크롤 콘텐츠 규칙(LAYOUT.stickyHeaderGap).
    paddingBottom: LAYOUT.stickyHeaderGap,
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
  /*
    빈 자리와 실패 자리가 **같은 높이**에 선다 — 탭을 오갈 때 화면이 위아래로 튀지
    않는다. 가운데정렬·타이포·덩어리 간격은 `V2EmptyState` 가 소유한다.
  */
  stateWrap: {
    paddingVertical: 48,
  },
  skeletonItem: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
})

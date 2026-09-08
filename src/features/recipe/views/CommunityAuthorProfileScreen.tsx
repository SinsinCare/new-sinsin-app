import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { Pressable, StyleSheet, View } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { useLocalSearchParams, type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { useAppRouter } from "@/src/shared/navigation"
import { afterModalTransitions } from "@/src/shared/components/AppModal"
import { showConfirm } from "@/src/lib/dialog"
import { resolveError } from "@/src/lib/errorMessage"
import { ErrorMessage } from "@/src/shared/components"
import {
  V2Button,
  V2EmptyState,
  V2IconButton,
  V2ScreenHeader,
  V2Skeleton,
  V2SkeletonGroup,
  V2Text,
  spacing,
  touchTarget,
  useV2Theme,
} from "@/src/design-system-v2"
import { useCommunityAuthor } from "../hooks/useCommunityAuthor"
import { useCommunityPosts } from "../hooks/useCommunityPosts"
import { NextPageErrorRow } from "../components/NextPageErrorRow"
import { PostListItem } from "../components/PostListItem"
import { CommunityProfileSummary } from "../components/community/CommunityProfileSummary"
import { COMMUNITY_GUTTER } from "../components/community/communityLayout"
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
  const { t: tPost } = useTranslation("recipe")
  const router = useAppRouter()
  const { colors } = useV2Theme()
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
  const {
    posts: authorPosts,
    isLoading: postsLoading,
    isError: postsError,
    error: postsFailure,
    refetch: refetchPosts,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    nextPageError,
  } = useCommunityPosts({ authorId, observe: hasValidAuthorId && !!profile })
  const { blockUserAsync } = useBlockedUsers()

  const renderPost = ({ item }: { item: CommunityMealPost }) => {
    const key =
      CATEGORY_LABEL_KEYS[item.category as keyof typeof CATEGORY_LABEL_KEYS]
    return (
      <PostListItem
        postId={item.id}
        category={key ? t(key) : item.category}
        createdAt={item.createdAt}
        title={item.title}
        summary={item.description}
        imageUri={item.imageUris[0] ?? item.imageUri}
        authorName={item.authorName}
        likeCount={item.likes}
        commentCount={item.comments}
        viewCount={item.views ?? 0}
        tags={item.tags}
        onPress={() => router.push(`/post/${item.id}` as Href)}
        isMine={item.isMine ?? false}
      />
    )
  }

  const handleBlock = async () => {
    if (!profile || profile.isMine) return
    const confirmed = await showConfirm({
      title: t("community.stories.blockTitle", { name: profile.nickName }),
      description: t("community.stories.blockBody"),
      confirmLabel: t("community.stories.block"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return
    try {
      await blockUserAsync(profile.nickName)
    } catch {
      return
    }
    await afterModalTransitions()
    router.back()
  }

  const header = profile ? (
    <>
      <CommunityProfileSummary
        name={profile.nickName}
        avatarUri={profile.profileImageUrl}
        badges={profile.badges}
      >
        <View style={styles.stats}>
          {(
            [
              ["followers", formatCount(profile.followerCount, i18n.language)],
              ["following", formatCount(profile.followingCount, i18n.language)],
            ] as const
          ).map(([mode, count]) => (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`${t(`community.author.${mode}`)} ${count}`}
              onPress={() =>
                router.push(
                  `/community/connections?id=${authorId}&mode=${mode}` as Href,
                )
              }
              style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
            >
              <V2Text token="subtext.medium" color={colors.label.neutral}>
                {t(`community.author.${mode}`)}
              </V2Text>
              <V2Text
                token="label.xSmall"
                color={colors.label.normal}
                style={styles.number}
              >
                {count}
              </V2Text>
            </Pressable>
          ))}
        </View>
        {profile.isMine ? (
          <V2Button
            size="s"
            color="neutral"
            variant="weak"
            fullWidth
            style={styles.followButton}
            onPress={() => router.push("/(settings)/profile-edit")}
          >
            {t("community.library.editProfile")}
          </V2Button>
        ) : (
          <V2Button
            size="s"
            color="neutral"
            variant={profile.isFollowing ? "weak" : "fill"}
            fullWidth
            disabled={isFollowingPending}
            accessibilityState={{
              selected: profile.isFollowing,
              disabled: isFollowingPending,
            }}
            style={{
              ...styles.followButton,
              backgroundColor: profile.isFollowing
                ? colors.fill.control
                : colors.label.normal,
            }}
            onPress={() => setFollowing(!profile.isFollowing)}
          >
            {t(
              profile.isFollowing
                ? "community.author.unfollow"
                : "community.author.follow",
            )}
          </V2Button>
        )}
      </CommunityProfileSummary>
      {authorPosts.length > 0 && (
        <View
          style={[
            styles.postsHeading,
            {
              borderBottomColor: colors.line.normal,
              borderTopColor: colors.background.lower,
            },
          ]}
        >
          <V2Text
            token="label.xSmall"
            color={colors.label.normal}
            accessibilityRole="header"
            lineBreakStrategyIOS="hangul-word"
          >
            {t("community.author.otherPosts", { name: profile.nickName })}
          </V2Text>
        </View>
      )}
    </>
  ) : null

  const failure = resolveError(error)
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
      ]}
    >
      {/* Navigation stays available while loading, on errors, and while the posts scroll. */}
      <V2ScreenHeader
        title={t("community.library.profileTitle")}
        titleAlign="center"
        safeAreaTop={false}
        onBack={() => router.back()}
        right={
          profile && !profile.isMine ? (
            <V2IconButton
              name="more"
              accessibilityLabel={tPost("post.blockUser")}
              onPress={() => void handleBlock()}
            />
          ) : undefined
        }
      />
      {!hasValidAuthorId ? (
        <View style={styles.state}>
          <ErrorMessage
            title={t("community.author.notFound")}
            message={t("notFound.description")}
          />
        </View>
      ) : isLoading || (!profile && !isError) ? (
        <V2SkeletonGroup>
          <CommunityProfileSummary>
            <V2Skeleton width="46%" height={touchTarget.min} radius="xs" />
            <V2Skeleton width="100%" height={touchTarget.min} radius="sm" />
          </CommunityProfileSummary>
        </V2SkeletonGroup>
      ) : !profile ? (
        <View style={styles.state}>
          <ErrorMessage
            title={failure.title}
            message={failure.body ?? ""}
            onRetry={failure.retryable ? () => void refetch() : undefined}
            retryLabel={t("action.retry")}
          />
        </View>
      ) : (
        <FlashList
          data={authorPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            postsLoading ? (
              <View style={styles.state}>
                <V2Skeleton width="100%" height={104} radius="sm" />
              </View>
            ) : postsError ? (
              <NextPageErrorRow
                title={resolveError(postsFailure).title}
                retryLabel={t("action.retry")}
                onRetry={() => void refetchPosts()}
              />
            ) : (
              <V2EmptyState
                surface="community_author"
                title={t("community.author.emptyPosts")}
              />
            )
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError)
              void fetchNextPage()
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchNextPageError ? (
              <NextPageErrorRow
                title={resolveError(nextPageError).title}
                retryLabel={t("action.retry")}
                onRetry={() => void fetchNextPage()}
              />
            ) : hasNextPage ? (
              <V2Button
                variant="weak"
                color="neutral"
                size="s"
                disabled={isFetchingNextPage}
                onPress={() => void fetchNextPage()}
              >
                {t("community.search.loadMore")}
              </V2Button>
            ) : null
          }
          maintainVisibleContentPosition={{ disabled: true }}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing[32] }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  state: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: COMMUNITY_GUTTER,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[20],
    marginVertical: -spacing[8],
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    minHeight: touchTarget.min,
  },
  number: { fontVariant: ["tabular-nums"] },
  followButton: { minHeight: touchTarget.min },
  postsHeading: {
    paddingHorizontal: COMMUNITY_GUTTER,
    paddingVertical: spacing[16],
    borderTopWidth: spacing[8],
    borderBottomWidth: borderWidth.thin,
  },
  pressed: { opacity: 0.65 },
})

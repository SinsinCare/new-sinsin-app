/**
 * 작성자 프로필 (목업 -30 ~ -33).
 *
 * ## 팔로워·팔로잉은 "없으면 감춘다"
 *
 * 서버 `stats` 는 `followerCount`/`followingCount` 를 **`null`** 로 준다 — 팔로우 표가
 * 스키마에 없다. `0` 을 그리면 "아무도 안 따른다" 를 없는 데이터로 주장하게 되므로
 * 유한한 수일 때만 통계 칸을 그린다.
 *
 * 팔로우 **버튼**은 지금 그릴 수 없다. 서버는 `following` 이라는 필드를 **아예 주지
 * 않는다**. 예전 코드는 `profile.following !== null` 로 켤지 말지를 정했는데, 없는 필드는
 * `undefined` 라 그 비교가 항상 `true` 였다 — 즉 **눌러도 아무 일 없는 버튼을 켜는
 * 조건**이었다. 지금은 훅의 `canFollow` 가 그 판단을 갖고 있고 오늘은 `false` 다.
 *
 * ## ⚠️ 계약 결손: 서버가 **작성자의 후기 목록을 주지 않는다**
 *
 * `GET /reviewers/:id` 는 계약 E13 대로 `{ profile, stats }` 두 키만 준다. 목업 -30 의
 * 후기 목록을 채울 응답이 없다는 뜻이다. 예전 코드는 `page.reviews` 를 무한쿼리로 돌려
 * 없는 배열을 순회하고 있었다. 지금은 목록 자리에 **명시적 안내**를 띄운다 —
 * `후기가 없어요` 로 쓰면 "이 사람은 후기를 안 썼다" 는 거짓이 되므로 문구가 다르다.
 * 서버가 목록을 싣는 날 훅의 `reviewsAvailable` 이 `true` 가 되고 이 분기는 사라진다.
 *
 * ## 후기 행은 상세 탭의 `ReviewCard` 와 **다른 조판**이다
 *
 * 상세 후기 탭의 카드는 머리가 `아바타 · 작성자 · 팔로우` 다. 그런데 여기는 이미
 * 그 작성자의 페이지라 작성자를 반복할 이유가 없고, 목업 -30 의 머리는
 * `상호명 › ······ 신고하기` 다. 축이 다르므로 `components/detail/ReviewCard` 를
 * 재사용하지 않고 이 파일 안에 프로필용 행을 둔다. (`ReviewCard` 가 나중에
 * `variant` 를 갖게 되면 그때 갈아 끼우면 된다.)
 *
 * ## ⚠️ 계약 결손: `ReviewDto` 에 식당이 없다
 *
 * 목업의 `신신국밥 ›` 링크를 그리려면 후기가 식당을 알아야 하는데 `ReviewDto` 에는
 * `restaurantId`/`restaurantName` 이 **없다**(`author`, `menuName`, `visitCount` 만 있다).
 * 없는 필드를 있는 척 캐스팅하지 않고, 해석을 `restaurantLabelFor` 로 주입받는다.
 * 주입이 없으면 그 줄을 그리지 않는다 — 서버 응답이 필드를 갖게 되면 이 prop 은 지운다.
 *
 * ## `게시글` 탭
 *
 * 게시글 API 가 이 도메인에 없다. 탭을 지우지 않고(목업의 축이다) 빈 안내를 띄운다.
 * 가짜 목록을 만들지 않는다.
 */

import { useCallback, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from "react-native"
// 리사이클링 리스트 — 무한 피드는 FlatList 대신 FlashList(v2, 추정치 불필요)
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"

import {
  V2Button,
  V2EmptyState,
  V2ErrorState,
  V2Icon,
  V2Tab,
  type V2ErrorStateRetry,
  radius,
  spacing,
  typography,
  useV2Theme,
  SemanticColors,
} from "@/src/design-system-v2"

import type { ReviewDto, ReviewSortOption, ReviewerProfileDto } from "../types"
import { DEFAULT_REVIEW_SORT, REVIEW_KEYWORDS } from "../data/filterCatalog"
import { useReviewerProfile } from "../hooks/useReviewerProfile"
import { resolveError } from "@/src/lib/errorMessage"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import {
  formatStatCount,
  reviewDateParts,
  reviewTagLayout,
} from "../utils/reviewFormat"
import { ReviewTabSkeleton } from "../components/detail/DetailSkeletons"
import { ReviewReportSheet } from "../components/ReviewReportSheet"
import { ReviewSortSheet } from "../components/ReviewSortSheet"

/** 목업의 아바타. 프로필 블록이 좌측 정렬이라 88 은 이름 두 줄만큼 커진다 — 64 가 맞다. */
const AVATAR_SIZE = 64
/** 후기 행의 별. 표시 전용이라 작다(입력용 별은 44). */
const STAR_SIZE = 15
const STAR_VALUES = [1, 2, 3, 4, 5] as const
/** 본문 접힘 줄 수. 목업 -30 이 3줄에서 `더보기` 를 낸다. */
const CONTENT_COLLAPSED_LINES = 3
const PHOTOS_PER_ROW = 3
const PHOTO_GAP = spacing[4]

const TAB_REVIEWS = "reviews"
const TAB_POSTS = "posts"

const KEYWORD_SPEC = new Map(
  REVIEW_KEYWORDS.map((item) => [item.value, item] as const),
)

export interface ReviewerProfileScreenProps {
  reviewerId: number
  onBack: () => void
  /**
   * 후기 → 식당 링크. `ReviewDto` 에 식당이 없어서(위 헤더 주석) 주입받는다.
   * `null` 을 돌려주면 그 줄을 그리지 않는다.
   */
  restaurantLabelFor?: (
    review: ReviewDto,
  ) => { restaurantId: number; name: string } | null
  onPressRestaurant?: (restaurantId: number) => void
  /**
   * 팔로우 토글. 서버가 팔로우 상태를 실을 때까지 버튼 자체가 안 그려지므로
   * 오늘은 호출되지 않는다(훅의 `canFollow` 가 `false`). 계약만 남겨 둔다.
   */
  onToggleFollow?: (profile: ReviewerProfileDto) => void
  /** 후기 사진 스트립 탭 → 라이트박스. 상세 후기 탭과 같은 계약이다. */
  onPressPhoto?: (review: ReviewDto, index: number) => void
  style?: ViewStyle
}

export function ReviewerProfileScreen({
  reviewerId,
  onBack,
  restaurantLabelFor,
  onPressRestaurant,
  onToggleFollow,
  onPressPhoto,
  style,
}: ReviewerProfileScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()

  const [tab, setTab] = useState<string>(TAB_REVIEWS)
  const [sort, setSort] = useState<ReviewSortOption>(DEFAULT_REVIEW_SORT)
  const [sortOpen, setSortOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<ReviewDto | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())

  const {
    profile,
    stats,
    reviews,
    reviewsAvailable,
    avgRating,
    totalCount,
    canFollow,
    isLoading,
    isError,
    error,
    refetch,
  } = useReviewerProfile(reviewerId, sort)

  const photoSize = useMemo(
    () =>
      Math.floor(
        (width - spacing[16] * 2 - PHOTO_GAP * (PHOTOS_PER_ROW - 1)) /
          PHOTOS_PER_ROW,
      ),
    [width],
  )

  const toggleExpanded = useCallback((reviewId: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(reviewId)) next.delete(reviewId)
      else next.add(reviewId)
      return next
    })
  }, [])

  const sortLabel = useMemo(
    () => t(dynamicKey(`restaurant.reviewSort.${sort}`)),
    [sort, t],
  )

  const renderReview = useCallback(
    ({ item }: ListRenderItemInfo<ReviewDto>) => (
      <ProfileReviewRow
        review={item}
        colors={colors}
        photoSize={photoSize}
        expanded={expanded.has(item.reviewId)}
        onToggleExpanded={() => toggleExpanded(item.reviewId)}
        restaurant={restaurantLabelFor?.(item) ?? null}
        onPressRestaurant={onPressRestaurant}
        onPressReport={() => setReportTarget(item)}
        authorName={profile?.nickName ?? ""}
        onPressPhoto={onPressPhoto}
      />
    ),
    [
      colors,
      expanded,
      onPressPhoto,
      onPressRestaurant,
      photoSize,
      profile?.nickName,
      restaurantLabelFor,
      toggleExpanded,
    ],
  )

  if (isError && !profile) {
    const resolved = resolveError(error)
    // 타입을 붙여 둬야 삼항의 두 갈래가 유니온으로 남는다 — 자세한 이유는 V2ErrorStateRetry.
    const retry: V2ErrorStateRetry = resolved.retryable
      ? { onRetry: refetch, retryLabel: t("action.retry") }
      : {}
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background.default,
            paddingTop: insets.top,
          },
          style,
        ]}
      >
        <BackBar onBack={onBack} label={t("action.back")} colors={colors} />
        {/*
          탈퇴한 리뷰어의 프로필은 404 다. `인터넷 연결을 확인한 뒤 다시 불러와
          주세요` + 재시도 버튼은 그 경우 두 번 거짓말한다 — 원인도 틀리고, 눌러도
          같은 404 다. 재시도가 상태를 바꿀 수 있을 때만 버튼을 준다.
        */}
        <V2ErrorState
          surface="restaurant_reviewer"
          title={resolved.title}
          description={resolved.body}
          {...retry}
        />
      </View>
    )
  }

  // 통계는 `profile` 이 아니라 `stats` 에 있다. 둘 다 `null` 로 오므로 칸을 그리지 않는다.
  const followerCount = finiteOrNull(stats?.followerCount)
  const followingCount = finiteOrNull(stats?.followingCount)

  const header = (
    <View>
      <View style={styles.profileBlock}>
        <View
          style={[styles.avatar, { backgroundColor: colors.fill.background }]}
        >
          {/* 서버 키는 `profileImageUrl` 이다(`avatarUrl` 이 아니다). */}
          {profile?.profileImageUrl ? (
            <Image
              source={remoteImageSource(profile.profileImageUrl)}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <V2Icon name="profile" size="xl" color={colors.label.assistive} />
          )}
        </View>
        <View style={styles.profileText}>
          <Text
            numberOfLines={1}
            style={[typography.title.xSmall, { color: colors.label.normal }]}
          >
            {profile?.nickName ?? ""}
          </Text>
          <View style={styles.statRow}>
            <StatCell
              value={formatStatCount(stats?.reviewCount ?? 0)}
              label={t("restaurant.reviewer.reviews")}
              colors={colors}
            />
            {followerCount !== null ? (
              <StatCell
                value={formatStatCount(followerCount)}
                label={t("restaurant.reviewer.followers")}
                colors={colors}
              />
            ) : null}
            {followingCount !== null ? (
              <StatCell
                value={formatStatCount(followingCount)}
                label={t("restaurant.reviewer.following")}
                colors={colors}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* 서버가 팔로우 상태를 실을 때까지 `canFollow` 가 `false` 라 이 블록은 안 그려진다.
          `following` 필드가 없어 "이미 팔로우 중" 을 알 방법도 없으므로, 상태 없는
          토글 버튼을 그리는 대신 아무것도 그리지 않는다. */}
      {canFollow && onToggleFollow && profile ? (
        <View style={styles.followWrap}>
          <V2Button
            size="l"
            color="brand"
            variant="weak"
            fullWidth
            onPress={() => onToggleFollow(profile)}
          >
            {t("restaurant.review.follow")}
          </V2Button>
        </View>
      ) : null}

      <V2Tab
        items={[
          { label: t("restaurant.reviewer.tabReviews"), value: TAB_REVIEWS },
          { label: t("restaurant.reviewer.tabPosts"), value: TAB_POSTS },
        ]}
        value={tab}
        onChange={setTab}
        alignment="fluid"
        size="l"
      />

      {tab === TAB_REVIEWS ? (
        <View style={styles.summaryRow}>
          <Text style={typography.label.xSmallWeak}>
            <Text style={{ color: colors.label.neutral }}>
              {`${t("restaurant.reviewer.summaryAllLabel")} `}
            </Text>
            <Text style={{ color: colors.primary.primary }}>
              {formatStatCount(totalCount)}
            </Text>
          </Text>
          {avgRating !== null ? (
            <Text style={typography.label.xSmallWeak}>
              <Text style={{ color: colors.label.neutral }}>
                {`${t("restaurant.reviewer.summaryRatingLabel")} `}
              </Text>
              <Text style={{ color: colors.primary.primary }}>
                {avgRating.toFixed(1)}
              </Text>
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.reviewer.sortLabel")}
            accessibilityValue={{ text: sortLabel }}
            onPress={() => setSortOpen(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.sortButton,
              pressed && styles.pressedRow,
            ]}
          >
            <Text
              style={[
                typography.label.xSmallWeak,
                { color: colors.label.normal },
              ]}
            >
              {sortLabel}
            </Text>
            <V2Icon name="chevronDown" size="sm" color={colors.label.neutral} />
          </Pressable>
        </View>
      ) : null}
    </View>
  )

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
        style,
      ]}
    >
      <BackBar onBack={onBack} label={t("action.back")} colors={colors} />

      <FlashList
        data={tab === TAB_REVIEWS ? reviews : []}
        keyExtractor={(item) => String(item.reviewId)}
        renderItem={renderReview}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.rowGap,
              { backgroundColor: colors.background.lower },
            ]}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ReviewTabSkeleton />
          ) : tab === TAB_POSTS ? (
            <V2EmptyState
              surface="restaurant_reviewer"
              icon="book"
              title={t("restaurant.reviewer.postsEmptyTitle")}
              description={t("restaurant.reviewer.postsEmptyBody")}
            />
          ) : reviewsAvailable ? (
            <V2EmptyState
              surface="restaurant_reviewer"
              icon="chat"
              title={t("restaurant.empty.reviewTitle")}
              description={t("restaurant.empty.reviewBody")}
            />
          ) : (
            /* 서버가 이 목록을 주지 않는다(계약 E13). `후기가 없어요` 로 쓰면
               "이 사람은 후기를 안 썼다" 는 거짓이 되므로 문구를 분리한다. */
            <V2EmptyState
              surface="restaurant_reviewer"
              icon="chat"
              title={t("restaurant.reviewer.reviewsUnavailableTitle")}
              description={t("restaurant.reviewer.reviewsUnavailableBody")}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[24] }}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      />

      <ReviewSortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        value={sort}
        onConfirm={(next) => {
          setSort(next)
          setSortOpen(false)
        }}
      />
      <ReviewReportSheet
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        reviewId={reportTarget?.reviewId ?? null}
        disableForOwn={reportTarget?.mine === true}
      />
    </View>
  )
}

/* ────────────────────────── 조각 ────────────────────────── */

function BackBar({
  onBack,
  label,
  colors,
}: {
  onBack: () => void
  label: string
  colors: SemanticColors
}) {
  return (
    <View style={styles.backBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [pressed && styles.pressedRow]}
      >
        <V2Icon name="chevronLeft" size="md" color={colors.label.normal} />
      </Pressable>
    </View>
  )
}

function StatCell({
  value,
  label,
  colors,
}: {
  value: string
  label: string
  colors: SemanticColors
}) {
  return (
    <View
      style={styles.statCell}
      accessibilityLabel={`${label} ${value}`}
      accessible
    >
      <Text style={[typography.label.medium, { color: colors.label.normal }]}>
        {value}
      </Text>
      <Text
        style={[typography.subtext.medium, { color: colors.label.alternative }]}
      >
        {label}
      </Text>
    </View>
  )
}

interface ProfileReviewRowProps {
  review: ReviewDto
  colors: SemanticColors
  photoSize: number
  expanded: boolean
  onToggleExpanded: () => void
  restaurant: { restaurantId: number; name: string } | null
  onPressRestaurant?: (restaurantId: number) => void
  onPressReport: () => void
  /** 사진 접근성 문구에 들어가는 작성자 이름. 이 화면의 모든 후기가 같은 사람이다. */
  authorName: string
  /** 라이트박스로. 없으면 사진이 눌리지 않는다(죽은 버튼 금지). */
  onPressPhoto?: (review: ReviewDto, index: number) => void
}

function ProfileReviewRow({
  review,
  colors,
  photoSize,
  expanded,
  onToggleExpanded,
  restaurant,
  onPressRestaurant,
  onPressReport,
  authorName,
  onPressPhoto,
}: ProfileReviewRowProps) {
  const { t } = useTranslation("common")
  const tags = reviewTagLayout({
    visitCount: review.visitCount,
    keywords: review.keywords,
  })
  const dateValue = reviewDateParts(review.createdAt)

  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewHead}>
        {restaurant ? (
          <Pressable
            accessibilityRole={onPressRestaurant ? "button" : "none"}
            accessibilityLabel={restaurant.name}
            disabled={onPressRestaurant == null}
            onPress={() => onPressRestaurant?.(restaurant.restaurantId)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.restaurantLink,
              pressed && onPressRestaurant != null && styles.pressedRow,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[typography.label.medium, { color: colors.label.normal }]}
            >
              {restaurant.name}
            </Text>
            <V2Icon
              name="chevronRight"
              size="sm"
              color={colors.label.alternative}
            />
          </Pressable>
        ) : (
          <View style={styles.restaurantLink} />
        )}
        {/* 내가 쓴 후기에는 신고 버튼을 그리지 않는다. */}
        {review.mine ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.review.report")}
            onPress={onPressReport}
            hitSlop={10}
            style={({ pressed }) => [pressed && styles.pressedRow]}
          >
            <Text
              style={[
                typography.subtext.large,
                { color: colors.label.assistive },
              ]}
            >
              {t("restaurant.review.report")}
            </Text>
          </Pressable>
        )}
      </View>

      {review.rating !== null ? (
        <View
          style={styles.starRow}
          accessibilityLabel={t("restaurant.review.form.ratingAccessibility", {
            count: review.rating,
          })}
          accessible
        >
          {STAR_VALUES.map((value) => (
            <V2Icon
              key={value}
              name="starFilled"
              size={STAR_SIZE}
              /*
                목업 -11/-30 의 앰버(#ffa938 = status.cautionary). 기능 전체가 이 한 값을
                쓴다 — 입력용 별(후기 작성)까지 같다. 근거는 `detail/StarRating.tsx` 헤더.
              */
              color={
                value <= (review.rating ?? 0)
                  ? colors.status.cautionary
                  : colors.label.assistive
              }
            />
          ))}
          <Text
            style={[
              typography.label.xSmall,
              styles.starValue,
              { color: colors.label.normal },
            ]}
          >
            {review.rating}
          </Text>
        </View>
      ) : null}

      {review.imageUrls.length > 0 ? (
        <ScrollView
          horizontal
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {review.imageUrls.map((url, index) => (
            <Pressable
              key={`${url}-${index}`}
              // 상세 후기 탭의 스트립과 같은 동작이다. 여기만 죽어 있으면 사용자는
              // 사진을 못 여는 것이 아니라 앱이 반응하지 않는 것으로 읽는다.
              disabled={!onPressPhoto}
              onPress={() => onPressPhoto?.(review, index)}
              accessibilityRole="imagebutton"
              accessibilityState={{ disabled: !onPressPhoto }}
              // 보간값을 넘기지 않으면 스크린리더가 `{{name}} 사진 {{number}}` 를
              // 그대로 읽는다. i18next 는 빠진 값을 지우지 않는다.
              accessibilityLabel={t("restaurant.photoAccessibility", {
                name: authorName,
                number: index + 1,
              })}
              style={({ pressed }) => [pressed && styles.pressedCard]}
            >
              <Image
                source={remoteImageSource(url)}
                style={[styles.photo, { width: photoSize, height: photoSize }]}
                contentFit="cover"
                transition={120}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Text
        numberOfLines={expanded ? undefined : CONTENT_COLLAPSED_LINES}
        style={[typography.subtext.large, { color: colors.label.neutral }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {review.content}
      </Text>
      {!expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("restaurant.review.expand")}
          onPress={onToggleExpanded}
          hitSlop={8}
          style={({ pressed }) => [
            styles.expandWrap,
            pressed && styles.pressedRow,
          ]}
        >
          <Text
            style={[
              typography.subtext.large,
              { color: colors.label.assistive },
            ]}
          >
            {t("restaurant.review.expand")}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.tagRow}>
        <View style={styles.tags}>
          {tags.visible.map((tag) => {
            const spec =
              tag.keyword != null ? KEYWORD_SPEC.get(tag.keyword) : undefined
            const label =
              tag.kind === "visit"
                ? t("restaurant.review.visitCount", {
                    count: tag.visitCount ?? 0,
                  })
                : spec
                  ? `${spec.emoji} ${t(dynamicKey(spec.labelKey))}`
                  : ""
            return (
              <View
                key={`${tag.kind}-${tag.keyword ?? "visit"}`}
                style={[
                  styles.tagChip,
                  { backgroundColor: colors.fill.normal },
                ]}
              >
                <Text
                  style={[
                    typography.label.xSmallWeak,
                    { color: colors.label.neutral },
                  ]}
                >
                  {label}
                </Text>
              </View>
            )
          })}
          {tags.overflow > 0 ? (
            <View
              style={[styles.tagChip, { backgroundColor: colors.fill.normal }]}
            >
              <Text
                style={[
                  typography.label.xSmallWeak,
                  { color: colors.label.neutral },
                ]}
              >
                {t("restaurant.review.moreKeywords", { count: tags.overflow })}
              </Text>
            </View>
          ) : null}
        </View>
        {dateValue ? (
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.alternative },
            ]}
          >
            {t("restaurant.review.date", {
              month: dateValue.month,
              day: dateValue.day,
              weekday: t(dynamicKey(dateValue.weekdayKey)),
            })}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/** 서버가 `null` 을 흘려도 `NaN` 이 화면에 남지 않게 한다(위 헤더 주석). */
function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBar: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing[16],
  },
  profileBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  profileText: { flex: 1, gap: spacing[8] },
  statRow: { flexDirection: "row", gap: spacing[24] },
  statCell: { gap: spacing[2] },
  followWrap: { paddingHorizontal: spacing[16], paddingBottom: spacing[20] },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  sortButton: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  /** 카드 사이는 선이 아니라 회색 면으로 끊는다 — 목업의 섹션 구분과 같은 규칙이다. */
  rowGap: { height: spacing[8] },
  reviewRow: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[8],
  },
  reviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  restaurantLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  starValue: { marginLeft: spacing[4] },
  photoStrip: { gap: PHOTO_GAP },
  photo: { borderRadius: radius.sm },
  expandWrap: { alignSelf: "flex-start" },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
    marginTop: spacing[4],
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    flexShrink: 1,
  },
  tagChip: {
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: radius.full,
  },
  pressedRow: { opacity: 0.6 },
  // 사진은 면이 크므로 카드와 같은 0.9 다(더 세게 누르면 번쩍인다).
  pressedCard: { opacity: 0.9 },
})

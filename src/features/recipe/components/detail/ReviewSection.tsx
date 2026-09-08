import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 리뷰 — 검수가 없는 카탈로그에서 품질 신호를 만드는 정직한 방법(계약 §0-3).
 *
 * ─── 이 섹션은 진짜로 동작한다 (실측) ────────────────────────────────────────
 * `리뷰 쓰기` 가 죽은 버튼이 아닌지 서버로 확인했다(2026-07-31, dev 백엔드):
 *   PUT  /api/v1/recipes/21/reviews/mine  {"rating":4,"body":"…"} → 200,
 *        `result.summary` 가 `{average:4, count:1, distribution:[0,0,0,1,0]}` 로 갱신됨
 *   GET  /api/v1/recipes/21/reviews       → 방금 쓴 리뷰가 `mine:true` 로 돌아옴
 * 그래서 버튼을 그대로 둔다. 동작하지 않았다면 지웠어야 한다(벤치마크 §G).
 *
 * 가장 중요한 규칙: **리뷰 0건이면 별점 영역을 아예 그리지 않는다**(계약 §6.1).
 * 0.0 이나 가짜 평균을 만들면 사용자는 그 숫자를 믿고 레시피를 고른다.
 *
 * ─── 분포 막대를 접은 이유 ──────────────────────────────────────────────────
 * 5줄짜리 별점 분포는 리뷰가 수십 건일 때 쓸모가 있다. 실측하면 dev 카탈로그 175건 중
 * 리뷰가 있는 레시피는 2건이고 그마저 1건씩이라, 분포는 "4점 1개, 나머지 0" 을 말하려고
 * 다섯 줄을 쓴다. 그래서 **리뷰가 `DISTRIBUTION_MIN_COUNT` 건 이상일 때만** 그린다.
 * 그 아래에서는 평균·개수 한 줄이 같은 정보를 더 정확히 전한다.
 *
 * 별 색은 브랜드 하나만 쓴다. 노란 별을 쓰면 화면에 세 번째 색이 생긴다.
 */
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  CARD_RADIUS,
  SECTION_TITLE_GAP,
  V2DotLoader,
  V2Icon,
  V2Skeleton,
  V2SkeletonGroup,
  V2SkeletonText,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { parseServerDate } from "../../services/communityPostService"
import { formatTimeAgo } from "../../utils/timeAgo"
import type { MyReview, RatingSummary, Review } from "../../types/recipeV2"
import {
  distributionRows,
  formatAverage,
  hasRatings,
} from "./recipeDetailModel"

/** 이 건수 아래에서는 분포 막대가 정보보다 장식에 가깝다(머리말 참고). */
const DISTRIBUTION_MIN_COUNT = 5

export interface ReviewSectionProps {
  rating: RatingSummary
  myReview: MyReview | null
  reviews: Review[]
  isLoading: boolean
  hasMore: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
  onWrite: () => void
  onDeleteMine: () => void
  isDeleting: boolean
  /**
   * 차단한 사용자의 리뷰는 목록에 오기 전에 이미 빠져 있다(`visibleReviews`).
   * 이 콜백은 **아직 차단하지 않은** 작성자를 차단할 때 쓴다. 없으면 차단 버튼을
   * 그리지 않는다 — 눌러도 아무 일 없는 버튼을 만들지 않는다.
   */
  onBlockAuthor?: (nickName: string) => void
}

export function ReviewSection({
  rating,
  myReview,
  reviews,
  isLoading,
  hasMore,
  isFetchingMore,
  onLoadMore,
  onWrite,
  onDeleteMine,
  isDeleting,
  onBlockAuthor,
}: ReviewSectionProps) {
  const { t, i18n } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const language = i18n.resolvedLanguage ?? i18n.language
  const showRatings = hasRatings(rating)
  const showDistribution = showRatings && rating.count >= DISTRIBUTION_MIN_COUNT

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text
            style={[styles.sectionTitle, { color: colors.label.normal }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.reviews.title")}
          </Text>
          {/* 별점 영역은 리뷰가 있을 때만 존재한다. */}
          {showRatings && rating.average != null && (
            <View style={styles.ratingInline}>
              <V2Icon
                name="starFilled"
                size={14}
                color={colors.primary.primary}
              />
              <Text
                style={[styles.ratingValue, { color: colors.label.normal }]}
              >
                {formatAverage(rating.average)}
              </Text>
              <Text
                style={[
                  styles.ratingCount,
                  { color: colors.label.alternative },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("detail.reviews.count", { count: rating.count })}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={onWrite}
          accessibilityRole="button"
          accessibilityLabel={
            myReview ? t("detail.reviews.editMine") : t("detail.reviews.write")
          }
          style={({ pressed }) => [
            styles.writeButton,
            {
              backgroundColor: colors.primary.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[styles.writeLabel, { color: colors.static.white }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {myReview
              ? t("detail.reviews.editMine")
              : t("detail.reviews.write")}
          </Text>
        </Pressable>
      </View>

      {showDistribution && (
        <View style={styles.distribution}>
          {distributionRows(rating).map((row) => (
            <View key={row.star} style={styles.distributionRow}>
              <Text
                style={[
                  styles.distributionStar,
                  { color: colors.label.alternative },
                ]}
                accessibilityLabel={t("detail.reviews.distributionRow", {
                  star: row.star,
                  amount: row.amount,
                })}
              >
                {row.star}
              </Text>
              <View
                style={[
                  styles.distributionTrack,
                  { backgroundColor: colors.fill.normal },
                ]}
              >
                <View
                  style={[
                    styles.distributionFill,
                    {
                      backgroundColor: colors.label.alternative,
                      width: `${row.ratio * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.distributionAmount,
                  { color: colors.label.assistive },
                ]}
              >
                {row.amount}
              </Text>
            </View>
          ))}
        </View>
      )}

      {myReview != null && (
        <View style={styles.mineRow}>
          <Text
            style={[styles.mineLabel, { color: colors.label.alternative }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.reviews.mine")}
          </Text>
          <Pressable
            onPress={onDeleteMine}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={t("detail.reviews.deleteMine")}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed || isDeleting ? 0.5 : 1,
            })}
          >
            <Text
              style={[styles.mineAction, { color: colors.label.neutral }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("detail.reviews.deleteMine")}
            </Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        // 리뷰 카드와 같은 면·간격으로 세 장을 깔아 둔다 — 도착해도 섹션 높이가 그대로다.
        <V2SkeletonGroup style={styles.list}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.card,
                { backgroundColor: colors.fill.alternative },
              ]}
            >
              <View style={styles.cardHead}>
                <V2Skeleton width={72} height={14} />
                <V2Skeleton width={40} height={12} />
              </View>
              <V2SkeletonText lines={2} lineHeight={14} />
            </View>
          ))}
        </V2SkeletonGroup>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text
            style={[styles.emptyTitle, { color: colors.label.normal }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.reviews.empty")}
          </Text>
          <Text
            style={[styles.emptyBody, { color: colors.label.alternative }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.reviews.emptyBody")}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              language={language}
              onBlockAuthor={onBlockAuthor}
            />
          ))}
        </View>
      )}

      {hasMore && (
        <Pressable
          onPress={onLoadMore}
          disabled={isFetchingMore}
          accessibilityRole="button"
          accessibilityLabel={t("detail.reviews.more")}
          style={({ pressed }) => [
            styles.more,
            { backgroundColor: colors.fill.normal, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          {isFetchingMore ? (
            <V2DotLoader size="s" color={colors.label.alternative} />
          ) : (
            <Text
              style={[styles.moreLabel, { color: colors.label.normal }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("detail.reviews.more")}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  )
}

function ReviewCard({
  review,
  language,
  onBlockAuthor,
}: {
  review: Review
  language: string
  onBlockAuthor?: (nickName: string) => void
}) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  /*
    `new Date(review.createdAt)` 이면 안 된다. 서버는 타임존 표기가 없는 UTC
    (`2026-08-20T10:59:07.030000`)를 주고, ES 명세는 **오프셋 없는 date-time 을
    로컬로** 읽는다 — KST 에서 정확히 9시간 이르게 읽힌다. 한 시간 전에 쓴 리뷰가
    "10시간 전" 으로, 00:30 에 쓴 리뷰가 전날 날짜로 나오던 자리다.
    커뮤니티 쪽이 전부 멀쩡했던 이유는 그쪽만 `parseServerDate` 를 지나기 때문이다.
  */
  const createdAt = parseServerDate(review.createdAt)
  const dateText = formatTimeAgo(createdAt, language)

  return (
    // 리뷰 한 건 = 회색 면 하나. 밑줄로 나누면 리뷰가 쌓일수록 가로줄만 쌓인다.
    <View style={[styles.card, { backgroundColor: colors.fill.alternative }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.author, { color: colors.label.normal }]}>
          {review.authorNickName}
        </Text>
        {review.mine && (
          <Text
            style={[styles.cardMeta, { color: colors.primary.primary }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.reviews.mine")}
          </Text>
        )}
        {dateText.length > 0 && (
          <Text style={[styles.cardMeta, { color: colors.label.assistive }]}>
            {dateText}
          </Text>
        )}
        {/*
          남이 쓴 리뷰에만 차단이 붙는다. 내 리뷰에는 이미 수정·삭제가 있고,
          자기 글을 차단하는 동작은 존재하지 않는다.

          라벨을 글자로 두는 이유: 아이콘 하나로는 "신고" 인지 "차단" 인지 "숨기기" 인지
          알 수 없다. 되돌리는 방법(설정 → 차단 목록)은 확인 창이 말한다.
        */}
        {!review.mine && onBlockAuthor && (
          <Pressable
            onPress={() => onBlockAuthor(review.authorNickName)}
            accessibilityRole="button"
            accessibilityLabel={t("detail.reviews.blockAuthor")}
            hitSlop={8}
            style={({ pressed }) => [
              styles.blockAction,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.cardMeta, { color: colors.label.assistive }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("detail.reviews.blockAuthor")}
            </Text>
          </Pressable>
        )}
      </View>

      <StarRow rating={review.rating} />

      {review.body != null && review.body.length > 0 && (
        <Text style={[styles.body, { color: colors.label.neutral }]}>
          {review.body}
        </Text>
      )}
    </View>
  )
}

function StarRow({ rating }: { rating: number }) {
  const { colors } = useV2Theme()
  const filled = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <View style={styles.stars} accessibilityLabel={`${filled}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <V2Icon
          key={star}
          name={star <= filled ? "starFilled" : "star"}
          size={13}
          color={star <= filled ? colors.primary.primary : colors.label.disable}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing[20], gap: SECTION_TITLE_GAP },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flexShrink: 1,
  },
  sectionTitle: { ...typography.title.xSmall },
  ratingInline: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  ratingValue: { ...typography.label.smallWeak },
  ratingCount: { ...typography.subtext.medium },
  writeButton: {
    height: touchTarget.min - spacing[8],
    paddingHorizontal: spacing[16],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  writeLabel: { ...typography.label.xSmall },

  distribution: { gap: spacing[6] },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  distributionStar: {
    ...typography.subtext.medium,
    minWidth: 12,
    textAlign: "right",
  },
  distributionTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  distributionFill: { height: 6, borderRadius: radius.full },
  distributionAmount: {
    ...typography.subtext.medium,
    minWidth: 28,
    textAlign: "right",
  },

  mineRow: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  /** 차단 버튼은 줄의 오른쪽 끝으로 민다 — 날짜 바로 옆에 붙으면 날짜의 일부로 읽힌다. */
  blockAction: { marginLeft: "auto" },
  pressed: { opacity: 0.6 },
  mineLabel: { ...typography.subtext.medium },
  mineAction: { ...typography.label.xSmall },

  loading: { paddingVertical: spacing[20], alignItems: "center" },
  emptyBlock: { gap: spacing[4] },
  emptyTitle: { ...typography.label.small },
  emptyBody: { ...typography.subtext.large },

  list: { gap: spacing[8] },
  card: { gap: spacing[8], padding: spacing[16], borderRadius: CARD_RADIUS },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flexWrap: "wrap",
  },
  author: { ...typography.label.small },
  cardMeta: { ...typography.subtext.medium },
  stars: { flexDirection: "row", gap: spacing[2] },
  body: { ...typography.body.mediumWeak },

  more: {
    height: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  moreLabel: { ...typography.label.small },
})

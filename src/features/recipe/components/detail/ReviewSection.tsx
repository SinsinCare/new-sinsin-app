/**
 * 리뷰 — 검수가 없는 카탈로그에서 품질 신호를 만드는 정직한 방법(계약 §0-3).
 *
 * 가장 중요한 규칙: **리뷰 0건이면 별점 영역을 아예 그리지 않는다**(계약 §6.1).
 * 시안은 데이터가 없는데도 `★4.0 (27)` 을 그렸다. 0.0 이나 가짜 평균을 만들면
 * 사용자는 그 숫자를 믿고 레시피를 고른다.
 *
 * 별 색은 브랜드 하나만 쓴다. 시안의 노란 별을 그대로 쓰면 화면에 세 번째 색이 생기고,
 * `safe*`(틸)는 "안전" 의미색이라 레시피에서 쓰지 않는다(§6.4).
 */
import { ActivityIndicator, Pressable } from "react-native"
import { Text, View, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { formatTimeAgo } from "../../utils/timeAgo"
import type { MyReview, RatingSummary, Review } from "../../types/recipeV2"
import {
  distributionRows,
  formatAverage,
  hasRatings,
} from "./recipeDetailModel"

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
}: ReviewSectionProps) {
  const { t, i18n } = useTranslation("recipe")
  const surface = useSurface()
  const language = i18n.resolvedLanguage ?? i18n.language
  const showRatings = hasRatings(rating)

  return (
    <YStack gap={16}>
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <XStack alignItems="center" gap={8}>
          <Text
            {...TYPE.sectionTitle}
            fontFamily="$body"
            fontWeight="700"
            color={surface.textStrong}
          >
            {t("detail.reviews.title")}
          </Text>
          {/* 별점 영역은 리뷰가 있을 때만 존재한다. */}
          {showRatings && rating.average != null && (
            <XStack alignItems="center" gap={4}>
              <Ionicons name="star" size={14} color={surface.brand} />
              <Text
                {...TYPE.value}
                fontFamily="$body"
                fontWeight="700"
                color={surface.textStrong}
              >
                {formatAverage(rating.average)}
              </Text>
              <Text
                {...TYPE.caption}
                fontFamily="$body"
                color={surface.textMuted}
              >
                {t("detail.reviews.count", { count: rating.count })}
              </Text>
            </XStack>
          )}
        </XStack>

        <Pressable
          onPress={onWrite}
          accessibilityRole="button"
          accessibilityLabel={
            myReview ? t("detail.reviews.editMine") : t("detail.reviews.write")
          }
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <XStack
            height={LAYOUT.chip.height}
            paddingHorizontal={12}
            alignItems="center"
            borderRadius={LAYOUT.chip.radius}
            backgroundColor={surface.brand}
          >
            <Text
              {...TYPE.caption}
              fontFamily="$body"
              fontWeight="600"
              color={surface.onBrand}
            >
              {myReview
                ? t("detail.reviews.editMine")
                : t("detail.reviews.write")}
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {showRatings && (
        <YStack gap={6}>
          {distributionRows(rating).map((row) => (
            <XStack key={row.star} alignItems="center" gap={8}>
              <Text
                {...TYPE.caption}
                fontFamily="$body"
                color={surface.textMuted}
                minWidth={12}
                textAlign="right"
                accessibilityLabel={t("detail.reviews.distributionRow", {
                  star: row.star,
                  amount: row.amount,
                })}
              >
                {row.star}
              </Text>
              <View
                flex={1}
                height={6}
                borderRadius={3}
                backgroundColor={surface.surface}
                overflow="hidden"
              >
                <View
                  height={6}
                  borderRadius={3}
                  backgroundColor={surface.textMuted}
                  width={`${row.ratio * 100}%`}
                />
              </View>
              <Text
                {...TYPE.caption}
                fontFamily="$body"
                color={surface.textWeak}
                minWidth={36}
                textAlign="right"
              >
                {row.amount}
              </Text>
            </XStack>
          ))}
        </YStack>
      )}

      {myReview && (
        <XStack gap={12} alignItems="center">
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
            {t("detail.reviews.mine")}
          </Text>
          <Pressable
            onPress={onDeleteMine}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={t("detail.reviews.deleteMine")}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              {...TYPE.caption}
              fontFamily="$body"
              fontWeight="600"
              color={isDeleting ? surface.textWeak : surface.textMuted}
            >
              {t("detail.reviews.deleteMine")}
            </Text>
          </Pressable>
        </XStack>
      )}

      {isLoading ? (
        <YStack paddingVertical={20} alignItems="center">
          <ActivityIndicator color={surface.brand} />
        </YStack>
      ) : reviews.length === 0 ? (
        <YStack gap={4}>
          <Text {...TYPE.value} fontFamily="$body" color={surface.textStrong}>
            {t("detail.reviews.empty")}
          </Text>
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
            {t("detail.reviews.emptyBody")}
          </Text>
        </YStack>
      ) : (
        <YStack>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} language={language} />
          ))}
        </YStack>
      )}

      {hasMore && (
        <Pressable
          onPress={onLoadMore}
          disabled={isFetchingMore}
          accessibilityRole="button"
          accessibilityLabel={t("detail.reviews.more")}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <YStack
            height={LAYOUT.ctaCompact.height}
            borderRadius={LAYOUT.ctaCompact.radius}
            backgroundColor={surface.surface}
            alignItems="center"
            justifyContent="center"
          >
            {isFetchingMore ? (
              <ActivityIndicator color={surface.textMuted} />
            ) : (
              <Text
                {...TYPE.cta}
                fontFamily="$body"
                fontWeight="600"
                color={surface.textStrong}
              >
                {t("detail.reviews.more")}
              </Text>
            )}
          </YStack>
        </Pressable>
      )}
    </YStack>
  )
}

function ReviewCard({
  review,
  language,
}: {
  review: Review
  language: string
}) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const createdAt = new Date(review.createdAt)
  const dateText = Number.isNaN(createdAt.getTime())
    ? ""
    : formatTimeAgo(createdAt, language)

  return (
    <YStack
      gap={8}
      paddingVertical={14}
      borderBottomWidth={1}
      borderBottomColor={surface.hairline}
    >
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <Text
          {...TYPE.cardTitle}
          fontFamily="$body"
          fontWeight="600"
          color={surface.textStrong}
        >
          {review.authorNickName}
        </Text>
        {review.mine && (
          <Text {...TYPE.caption} fontFamily="$body" color={surface.brand}>
            {t("detail.reviews.mine")}
          </Text>
        )}
        {dateText.length > 0 && (
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textWeak}>
            {dateText}
          </Text>
        )}
      </XStack>

      <StarRow rating={review.rating} />

      {review.body && (
        <Text
          {...TYPE.value}
          fontFamily="$body"
          color={surface.text}
          lineHeight={23}
        >
          {review.body}
        </Text>
      )}
    </YStack>
  )
}

function StarRow({ rating }: { rating: number }) {
  const surface = useSurface()
  const filled = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <XStack gap={2} accessibilityLabel={`${filled}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= filled ? "star" : "star-outline"}
          size={12}
          color={star <= filled ? surface.brand : surface.border}
        />
      ))}
    </XStack>
  )
}

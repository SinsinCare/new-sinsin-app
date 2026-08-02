/**
 * 후기 한 장 (목업 -12 / -19 / -20).
 *
 * ```
 * (아바타) 신신마스터                              [팔로잉]
 *          후기 20 · 팔로워 5
 * [사진][사진][사진]
 * ★★★★☆ 4
 * 국물이 진하면서도 느끼하지 않아 마지막까지.
 * 고기도 넉넉하게 들어 있고 …
 * 더보기
 * [4번째 방문] [😋 맛] [+2]                        07.21.화
 * ```
 *
 * ## 작성자는 응답에서 **평평하게** 온다
 *
 * 서버는 `authorName`/`authorProfileImageUrl`/`authorReviewCount`/`authorFollowerCount`/
 * `reviewerId` 다섯 필드를 준다. `review.author` 라는 중첩 객체는 **없다** — 이 파일이
 * `review.author.reviewerId` 를 읽고 있었고, 그래서 후기 탭과 홈 탭이 함께
 * `Cannot read property 'reviewerId' of undefined` 로 죽었다. 모양은
 * `reviewAuthor.ts` 의 `reviewAuthorOf()` 가 만든다. 되돌리지 말 것.
 *
 * ## 팔로워가 `null` 이면 숫자를 만들지 않는다
 *
 * 서버에 팔로우 테이블이 **없다**. 그래서 `authorFollowerCount` 가 명시적 `null` 로 온다.
 * 그때 `팔로워 0` 을 그리면 "아무도 안 따른다" 는 사실을 없는 데이터로 주장하게 된다.
 * 통계 줄은 있는 값만 이어 붙인다.
 *
 * ## ⚠️ 머리 우측 슬롯은 `신고하기` 다 (팔로우 버튼은 지웠다)
 *
 * 목업 -11/-12/-19/-20 은 이 자리에 `팔로우`/`팔로잉` 을 그린다. 그런데 서버는 팔로우
 * **상태 자체를 내리지 않는다** — 표가 스키마에 없다. 한때 이 파일에 `headerAction`
 * (`"follow" | "report"`) 축과 팔로우 버튼 분기가 있었고, 그 조건이
 * `author.following !== null` 이었다. 그 필드가 응답에 없으니 `undefined !== null` 이
 * 항상 참이라, **켜면 눌러도 아무 일 없는 버튼이 나오는** 분기였다. 즉 축을 남겨 둔 대가로
 * 죽은 버튼 하나가 대기하고 있었다. 그래서 축과 분기를 함께 지웠다 —
 * 서버가 팔로우 상태를 싣는 날 `ReviewAuthorView` 에 그 필드를 더하고 여기에 되살린다.
 * 신고는 E11 로 실제 동작하므로 그 자리는 계속 `신고하기` 가 쓴다.
 *
 * ## 태그 칩을 `V2Chip`/`V2Badge` 로 만들지 않은 이유
 *
 * 이 칩들은 누를 수 없는 표시물이라 `V2Chip`(Pressable)이 아니고, `V2Badge` 에는
 * 목업의 회색 면 pill 이 없다(설계조사 GAP). 두 줄짜리 로컬 pill 로 그리고, DS 에
 * 그 배지가 생기면 그때 갈아탄다. 면은 `fill.normal` 이다 — 목업 -12 를 4배로 확대하면
 * `4번째 방문`·`😋 맛`·`+2` 가 테두리 없는 옅은 회색 면이고, 같은 칩을 그리는
 * `ReviewerProfileScreen`·`RestaurantPhotoViewerScreen` 도 그 토큰을 쓴다.
 *
 * ## 날짜를 `Intl` 없이 만든다
 *
 * Hermes 에 `Intl.DateTimeFormat` 관련 API 는 신뢰할 수 없고 저장소 eslint 가
 * `Intl.*` 상당수를 금지한다. `MM.DD.요일` 은 게터 세 개로 충분하다.
 */

import { useState } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

import { REVIEW_KEYWORDS } from "../../data/filterCatalog"
import type { ReviewDto } from "../../types"
import { reviewAuthorOf } from "./reviewAuthor"
import { StarRow } from "./StarRating"

/** 본문 클램프 줄 수. 목업 -12 그대로. */
const CONTENT_LINES = 3

/** 사진 스트립에 노출할 최대 장수. 목업은 3열이다. */
const PHOTO_COLUMNS = 3

/** 아바타 지름. 목업 40. */
const AVATAR_SIZE = 40

/**
 * `Date.getDay()` 인덱스(0=일요일) → 짧은 요일 키. 배열 순서가 곧 매핑이라
 * 요일 계산식을 화면에 흘리지 않는다.
 */
const SHORT_WEEKDAY_KEY = [
  "restaurant.weekdayShort.SUN",
  "restaurant.weekdayShort.MON",
  "restaurant.weekdayShort.TUE",
  "restaurant.weekdayShort.WED",
  "restaurant.weekdayShort.THU",
  "restaurant.weekdayShort.FRI",
  "restaurant.weekdayShort.SAT",
] as const

const KEYWORD_INDEX = new Map(REVIEW_KEYWORDS.map((k) => [k.value, k] as const))

export interface ReviewCardProps {
  review: ReviewDto
  /** 작성자 프로필 화면으로. 라우트가 아직 없으면 주지 않는다 — 그때 이름은 눌리지 않는다. */
  onPressAuthor?: (reviewerId: number) => void
  /** 사진 뷰어로. index 는 이 후기 안에서의 순번이다. */
  onPressPhoto?: (review: ReviewDto, index: number) => void
  /** 신고 시트 열기. 내 후기(`mine`)에는 그리지 않는다. */
  onReport?: (reviewId: number) => void
  style?: ViewStyle
}

export function ReviewCard({
  review,
  onPressAuthor,
  onPressPhoto,
  onReport,
  style,
}: ReviewCardProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [expanded, setExpanded] = useState(false)

  /* 서버는 작성자를 평평한 네 필드로 준다(`authorName`/`authorProfileImageUrl`/…).
     `review.author` 라는 중첩 객체는 **응답에 없어서** 바로 아래 `author.reviewerId` 가
     후기 탭과 홈 탭을 함께 죽이고 있었다. 모양은 `reviewAuthorOf` 가 만든다. */
  const author = reviewAuthorOf(review)
  const reviewerId = author.reviewerId

  // 있는 값만 이어 붙인다. 팔로워가 null 이면 `후기 20` 만 남는다.
  const statsLine =
    author.followerCount === null
      ? t("restaurant.review.reviewerReviewsOnly", {
          reviews: author.reviewCount,
        })
      : t("restaurant.review.reviewerStats", {
          reviews: author.reviewCount,
          followers: author.followerCount,
        })

  const showReport = Boolean(onReport) && !review.mine

  const photos = review.imageUrls.slice(0, PHOTO_COLUMNS)
  const primaryKeyword = review.keywords[0]
    ? KEYWORD_INDEX.get(review.keywords[0])
    : undefined
  const extraKeywordCount = Math.max(0, review.keywords.length - 1)
  const dateParts = reviewDateParts(review.createdAt)

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Pressable
          disabled={reviewerId === null || !onPressAuthor}
          onPress={() => {
            if (reviewerId !== null) onPressAuthor?.(reviewerId)
          }}
          accessibilityRole="button"
          accessibilityState={{
            disabled: reviewerId === null || !onPressAuthor,
          }}
          style={({ pressed }) => [
            styles.authorRow,
            pressed && styles.pressedRow,
          ]}
        >
          {author.avatarUrl ? (
            <Image
              source={{ uri: author.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View
              style={[styles.avatar, { backgroundColor: colors.fill.normal }]}
            >
              <V2Icon
                name="profile"
                size={iconSize.md}
                color={colors.label.assistive}
              />
            </View>
          )}
          <View style={styles.authorTexts}>
            <Text
              style={[typography.label.small, { color: colors.label.normal }]}
              numberOfLines={1}
            >
              {author.name}
            </Text>
            <Text
              style={[
                typography.subtext.medium,
                { color: colors.label.neutral },
              ]}
              numberOfLines={1}
            >
              {statsLine}
            </Text>
          </View>
        </Pressable>

        {showReport && (
          <Pressable
            onPress={() => onReport?.(review.reviewId)}
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
            hitSlop={spacing[8]}
            style={({ pressed }) => [pressed && styles.pressedText]}
          >
            <Text
              style={[
                typography.subtext.medium,
                { color: colors.label.assistive },
              ]}
            >
              {t("restaurant.review.report")}
            </Text>
          </Pressable>
        )}
      </View>

      {photos.length > 0 && (
        <View style={styles.photoRow}>
          {photos.map((url, index) => (
            <Pressable
              key={`${url}-${index}`}
              disabled={!onPressPhoto}
              onPress={() => onPressPhoto?.(review, index)}
              accessibilityRole="imagebutton"
              accessibilityState={{ disabled: !onPressPhoto }}
              accessibilityLabel={t("restaurant.photoAccessibility", {
                name: author.name,
                number: index + 1,
              })}
              style={({ pressed }) => [
                styles.photoCell,
                pressed && styles.pressedCard,
              ]}
            >
              <Image
                source={{ uri: url }}
                style={[
                  styles.photo,
                  { backgroundColor: colors.fill.alternative },
                ]}
                contentFit="cover"
                transition={120}
              />
            </Pressable>
          ))}
        </View>
      )}

      <StarRow rating={review.rating} />

      {review.content.length > 0 && (
        <View style={styles.contentBlock}>
          <Text
            style={[typography.subtext.large, { color: colors.label.normal }]}
            numberOfLines={expanded ? undefined : CONTENT_LINES}
          >
            {review.content}
          </Text>
          {!expanded && (
            <Pressable
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityState={{ disabled: false }}
              hitSlop={spacing[8]}
              style={({ pressed }) => [pressed && styles.pressedText]}
            >
              <Text
                style={[
                  typography.subtext.medium,
                  { color: colors.label.assistive },
                ]}
              >
                {t("restaurant.review.expand")}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.footerRow}>
        <View style={styles.tagRow}>
          <TagPill
            label={t("restaurant.review.visitCount", {
              count: review.visitCount,
            })}
          />
          {primaryKeyword && (
            <TagPill
              label={`${primaryKeyword.emoji} ${t(
                `restaurant.review.keywords.${primaryKeyword.value}`,
              )}`}
            />
          )}
          {extraKeywordCount > 0 && (
            <TagPill
              label={t("restaurant.review.moreKeywords", {
                count: extraKeywordCount,
              })}
            />
          )}
        </View>
        {dateParts && (
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.assistive },
            ]}
          >
            {t("restaurant.review.date", {
              month: dateParts.month,
              day: dateParts.day,
              weekday: t(dateParts.weekdayKey),
            })}
          </Text>
        )}
      </View>
    </View>
  )
}

/** 누를 수 없는 표시용 pill. 회색 면 배지가 DS 에 없어서 여기서 그린다(헤더 주석). */
function TagPill({ label }: { label: string }) {
  const { colors } = useV2Theme()
  return (
    <View style={[styles.pill, { backgroundColor: colors.fill.normal }]}>
      <Text style={[typography.caption.small, { color: colors.label.neutral }]}>
        {label}
      </Text>
    </View>
  )
}

/**
 * `2026-07-21T…` → `{ month:"07", day:"21", weekdayKey:"…TUE" }`.
 * 파싱이 안 되면 `null` — 잘못된 날짜를 그리는 대신 날짜 줄을 비운다.
 * 문자열 조립은 화면이 `t()` 로 한다(로케일마다 순서가 다르다).
 */
function reviewDateParts(iso: string): {
  month: string
  day: string
  weekdayKey: (typeof SHORT_WEEKDAY_KEY)[number]
} | null {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  const date = new Date(at)
  return {
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
    weekdayKey: SHORT_WEEKDAY_KEY[date.getDay()],
  }
}

const styles = StyleSheet.create({
  card: { gap: spacing[10], paddingVertical: spacing[20] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  authorRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  authorTexts: { flex: 1, gap: spacing[2] },
  // 세 칸을 균등 분할한다. 사진 개수가 1~2장이면 그만큼만 넓어지지 않고 왼쪽부터 채운다.
  photoRow: { flexDirection: "row", gap: spacing[4] },
  photoCell: { flex: 1 },
  photo: { width: "100%", aspectRatio: 1, borderRadius: radius.sm },
  contentBlock: { gap: spacing[4] },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  tagRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  pressedRow: { opacity: 0.6 },
  pressedText: { opacity: 0.85 },
  pressedCard: { opacity: 0.9 },
})

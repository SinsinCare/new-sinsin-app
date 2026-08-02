/**
 * 별점 표시. v2 에 별점 프리미티브가 **없어서**(설계조사 GAP: "no v2 star-rating primitive")
 * 상세 화면이 쓰는 두 모양을 여기 한 곳에 모았다. 세 파일에 각자 별을 그리면
 * 같은 화면에서 별 크기·색이 어긋난다.
 *
 * - `StarScore`  — 별 하나 + 숫자(+괄호 리뷰수). 상세 헤더(-9)와 평점 분해(-11) 상단.
 * - `StarRow`    — 별 5개 + 숫자. 후기 카드(-12).
 *
 * ## 색은 `status.cautionary` — 기능 전체에서 이 하나뿐이다
 *
 * 목업의 별을 확대해 픽셀을 뽑으면 `#FFA938` 이고, 이 값은 `status.cautionary` 의 라이트
 * 값과 정확히 같다(다크 `#ffc06e` 로 저절로 밝아진다). 카드(-5)·평점 분해(-11)·후기
 * 행(-11)·후기 작성의 입력 별(-27)이 전부 같은 `#FFA938` 이므로 **표시용과 입력용을
 * 나누지 않는다.** `accentForeground.yellow`(`#ffcd38`)는 더 노랗고 흰 배경에서 흐리다.
 *
 * 토큰 이름에 "경고" 가 들어 있는 것이 어색해 보여 한때 `RestaurantCard` 만
 * `primitives.lightOrange[500]` 을, 후기 작성 화면만 `primary.primary` 를 따로 썼다.
 * 세 값이 라이트 모드에서 두 개로 보이고 다크 모드에서 세 개로 갈라져, 같은 4.0 이
 * 카드와 상세에서 다른 색이 됐다. 이름보다 한 값을 지키는 것이 먼저다.
 *
 * ## 스크린리더에는 별을 세지 않게 한다
 *
 * 별 아이콘 5개를 각각 노출하면 "별 별 별 별 별" 로 읽힌다. 컨테이너에
 * `accessibilityLabel` 한 줄을 주고 자식은 숨긴다.
 */

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

/** 별 5개. 목업은 정수 단위로만 채운다(반쪽 별이 없다). */
const MAX_STARS = 5

export interface StarScoreProps {
  rating: number | null
  /** 있으면 `(1,413)` 로 덧붙인다. `null` 이면 괄호 자체를 그리지 않는다. */
  reviewCount?: number | null
  /** 큰 평점(평점 분해 헤더)인지. 기본은 헤더용 작은 크기. */
  size?: "m" | "l"
  style?: ViewStyle
}

/** size → 별 크기 + 숫자 타이포. 목업 §4.6 의 `4.2` 24 bold / 헤더의 `4.0` 15 semibold. */
const SCORE_SIZE = {
  m: { icon: iconSize.xs, value: typography.label.small },
  l: { icon: iconSize.lg, value: typography.title.large },
} as const

export function StarScore({
  rating,
  reviewCount = null,
  size = "m",
  style,
}: StarScoreProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const s = SCORE_SIZE[size]

  // 평점이 없는 식당은 `-` 를 그리지 않고 줄 자체를 비운다. 0.0 으로 보이면 거짓말이다.
  if (rating === null) return null

  const value = rating.toFixed(1)

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={t("restaurant.detail.ratingAccessibility", {
        rating: value,
        count: reviewCount ?? 0,
      })}
    >
      <V2Icon
        name="starFilled"
        size={s.icon}
        color={colors.status.cautionary}
      />
      <Text style={[s.value, { color: colors.label.normal }]}>{value}</Text>
      {reviewCount !== null && (
        <Text
          style={[typography.subtext.medium, { color: colors.label.neutral }]}
        >
          {`(${reviewCount.toLocaleString("ko-KR")})`}
        </Text>
      )}
    </View>
  )
}

export interface StarRowProps {
  rating: number | null
  /** 별 옆 숫자. 목업 후기 카드는 `★★★★☆ 4` 처럼 정수를 붙인다. */
  showValue?: boolean
  style?: ViewStyle
}

export function StarRow({ rating, showValue = true, style }: StarRowProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  if (rating === null) return null

  const filled = Math.max(0, Math.min(MAX_STARS, Math.round(rating)))

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={t("restaurant.review.form.ratingAccessibility", {
        count: filled,
      })}
    >
      <View style={styles.stars}>
        {Array.from({ length: MAX_STARS }, (_, index) => (
          <V2Icon
            key={index}
            name="starFilled"
            size={iconSize.xs}
            // 빈 별도 같은 모양으로 그리고 색만 죽인다 — 윤곽선 별과 섞으면
            // 채워진 개수가 한눈에 세어지지 않는다.
            color={
              index < filled ? colors.status.cautionary : colors.label.disable
            }
          />
        ))}
      </View>
      {showValue && (
        <Text style={[typography.label.xSmall, { color: colors.label.normal }]}>
          {String(filled)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  // 별끼리는 붙여 둔다 — 사이가 벌어지면 5개가 한 덩어리로 읽히지 않는다.
  stars: { flexDirection: "row", alignItems: "center" },
})

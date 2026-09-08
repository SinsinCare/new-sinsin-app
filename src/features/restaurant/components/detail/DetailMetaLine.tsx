import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 상세 제목 아래의 **메타 한 줄**: `한식 · ★ 4.9 · 리뷰 8`.
 *
 * ## 두 줄이던 것을 한 줄로 접었다
 *
 * 예전에는 상호명 옆에 음식 종류 배지가 붙고(`868식당 [한식]`), 그 아래 평점 줄이
 * 따로 있었다(`★ 4.9 (8) ›`). 사실 세 조각을 담는 데 세로 두 줄과 배지 하나를 썼고,
 * 그만큼 대표사진이 접힌 화면(fold) 밖으로 밀렸다. 네이버 지도 장소 상세는 같은 세
 * 조각을 `한식 · ★ 4.63 · 리뷰 1,848` 한 줄에 넣는다 — 배지는 종류가 여러 개일 때
 * 값어치가 있지 우리처럼 **항상 하나**일 때는 상자만 늘린다.
 *
 * ## 줄 전체가 후기 탭으로 가는 버튼이다
 *
 * 예전 평점 줄에 있던 `›` 와 그 동작을 잃지 않으려고 줄 전체를 누를 수 있게 했다.
 * 평점이 없는 식당(`rating === null`)은 갈 곳이 없으므로 **버튼이 아니라 그냥 글줄**로
 * 그린다 — 눌러도 아무 일 없는 줄을 남기지 않는다.
 *
 * ## 리뷰 수를 `(8)` 이 아니라 `리뷰 8` 로 쓴다
 *
 * 괄호 숫자는 평점의 정밀도(예: 4.9 ± 뭔가)로도 읽힌다. 한 줄에 세 조각을 나란히 두면
 * 그 오독이 특히 쉬워서 라벨을 붙였다. 리뷰가 0건이면 조각 자체를 뺀다 — `리뷰 0` 은
 * 없는 정보를 굳이 선언한다.
 */

import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

export interface DetailMetaLineProps {
  /** 이미 번역된 음식 종류 라벨(`한식`). 없으면 조각을 뺀다. */
  cuisineLabel: string | null
  rating: number | null
  reviewCount: number | null
  /** 후기 탭으로. 평점이 있을 때만 줄이 버튼이 된다. */
  onPressRating?: () => void
}

export function DetailMetaLine({
  cuisineLabel,
  rating,
  reviewCount,
  onPressRating,
}: DetailMetaLineProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  const dot = t("restaurant.metaDot")
  const ratingText =
    rating === null
      ? null
      : t("restaurant.detail.metaRating", { rating: rating.toFixed(1) })
  const reviewText =
    reviewCount !== null && reviewCount > 0
      ? // 천 단위 구분자를 붙여서 넘긴다. `count` 라는 이름으로 넘기면 i18next 가
        // 복수형 키(`_one`/`_other`)를 찾아 나서고, 없으면 영어에서 `1 reviews` 가 된다.
        t("restaurant.detail.metaReviews", {
          formattedCount: reviewCount.toLocaleString("ko-KR"),
        })
      : null

  const pieces: string[] = []
  if (cuisineLabel) pieces.push(cuisineLabel)
  if (ratingText) pieces.push(ratingText)
  if (reviewText) pieces.push(reviewText)
  if (pieces.length === 0) return null

  const interactive = rating !== null && Boolean(onPressRating)

  const body = (
    <>
      {cuisineLabel !== null && (
        <Text
          style={[typography.subtext.large, { color: colors.label.neutral }]}
        >
          {cuisineLabel}
        </Text>
      )}
      {cuisineLabel !== null && ratingText !== null && <Dot text={dot} />}
      {ratingText !== null && (
        <>
          <V2Icon
            name="starFilled"
            size={iconSize.xs}
            color={colors.status.cautionary}
          />
          <Text
            style={[typography.label.small, { color: colors.label.normal }]}
          >
            {ratingText}
          </Text>
        </>
      )}
      {ratingText !== null && reviewText !== null && <Dot text={dot} />}
      {reviewText !== null && (
        <Text
          style={[typography.subtext.large, { color: colors.label.neutral }]}
        >
          {reviewText}
        </Text>
      )}
      {interactive && (
        <V2Icon
          name="chevronRight"
          size={iconSize.xs}
          color={colors.label.alternative}
        />
      )}
    </>
  )

  const accessibilityLabel = t("restaurant.detail.metaAccessibility", {
    cuisine: cuisineLabel ?? "",
    rating: rating === null ? 0 : rating.toFixed(1),
    count: reviewCount ?? 0,
  })

  if (!interactive) {
    // 갈 곳이 없으면 버튼으로 만들지 않는다. 스크린리더에도 버튼으로 읽히지 않는다.
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        {body}
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPressRating}
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={spacing[8]}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  )
}

/** 조각 사이의 가운뎃점. 정보가 아니므로 스크린리더에서 숨긴다. */
function Dot({ text }: { text: string }) {
  const { colors } = useV2Theme()
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[typography.subtext.large, { color: colors.label.assistive }]}
    >
      {text}
    </Text>
  )
}

const styles = StyleSheet.create({
  /*
    좁은 화면에서 감기게 둔다. `numberOfLines={1}` 로 잘라 버리면 상호명이 긴 가게에서
    리뷰 수가 통째로 사라진다 — 접히는 편이 사라지는 편보다 낫다.
  */
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[4],
  },
  pressed: { opacity: 0.6 },
})

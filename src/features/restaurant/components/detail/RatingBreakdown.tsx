import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 평점 분해 (목업 -11 / -19). 큰 평점 한 줄 + 키워드 5행 바.
 *
 * ```
 * ★ 4.2  451개 평점
 * ┌────────────────────────────────┐
 * │ 😋 맛                       21 │   ← 트랙 h40, 채움폭 = 비율
 * └────────────────────────────────┘
 * ```
 *
 * ## `V2ProgressBar` 를 쓰지 않은 이유
 *
 * 그 컴포넌트의 최대 높이는 8px 이고 트랙 안에 텍스트를 넣을 수 없다. 목업의 바는
 * 높이 40 의 **행 자체**가 트랙이고 라벨과 개수가 그 안에 얹혀 있다. 8px 바를
 * 라벨 옆에 따로 두면 목업과 다른 물건이 된다. 그래서 여기서 직접 그린다.
 *
 * ## 분모를 `totalCount` 가 아니라 최다 키워드로 잡는다
 *
 * 총 평점 451개에 대해 `맛 21` 을 그리면 채움이 4.6% 라 다섯 줄이 전부 빈 칸으로 보인다.
 * 키워드는 여러 개 고를 수 있어서 합이 총 평점 수와 일치하지도 않는다. 목업은
 * `맛 21` 이 거의 꽉 차고 `주차 0` 이 비어 있다 — 즉 **키워드끼리의 상대 비교**다.
 * 그래서 최다 개수를 100% 로 둔다. 절대값은 오른쪽 숫자가 이미 말해 준다.
 */

import { StyleSheet, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { radius, spacing, typography, useV2Theme } from "@/src/design-system-v2"

import { GUTTER, SECTION_GAP } from "../../layout"
import { REVIEW_KEYWORDS } from "../../data/filterCatalog"
import type { ReviewBreakdown } from "../../types"
import { StarScore } from "./StarRating"

/** 목업의 바 높이. 라벨과 개수가 이 안에 들어간다. */
const BAR_HEIGHT = 40

export interface RatingBreakdownProps {
  breakdown: ReviewBreakdown
  style?: ViewStyle
}

export function RatingBreakdown({ breakdown, style }: RatingBreakdownProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  const counts = REVIEW_KEYWORDS.map(
    (keyword) => breakdown.keywordCounts[keyword.value] ?? 0,
  )
  // 전부 0이면 나누기 0이 된다. 그때는 모든 바가 비어 있는 것이 맞다.
  const maxCount = Math.max(...counts, 0)

  return (
    <View style={[styles.container, style]}>
      <View style={styles.scoreRow}>
        <StarScore rating={breakdown.avgRating} size="l" />
        <Text
          style={[typography.subtext.large, { color: colors.label.neutral }]}
        >
          {t("restaurant.review.ratingCount", { count: breakdown.ratedCount })}
        </Text>
      </View>

      <View style={styles.bars}>
        {REVIEW_KEYWORDS.map((keyword, index) => {
          const count = counts[index] ?? 0
          const ratio = maxCount > 0 ? count / maxCount : 0
          return (
            <View
              key={keyword.value}
              style={[styles.track, { backgroundColor: colors.fill.normal }]}
              accessible
              accessibilityLabel={`${t(`restaurant.review.keywords.${keyword.value}`)} ${count}`}
            >
              {/*
                채움은 절대위치로 트랙 위에 깔고 텍스트를 그 위에 올린다.
                flex 로 두 칸을 나누면 채움이 0% 일 때 라벨이 왼쪽 끝으로 튀어붙는다.
              */}
              <View
                style={[
                  styles.fill,
                  {
                    width: `${ratio * 100}%`,
                    backgroundColor: colors.accentForeground.orangeWeak,
                  },
                ]}
              />
              <View style={styles.trackContent}>
                <Text style={typography.subtext.large}>{keyword.emoji}</Text>
                <Text
                  style={[
                    typography.label.small,
                    styles.label,
                    { color: colors.label.normal },
                  ]}
                >
                  {t(`restaurant.review.keywords.${keyword.value}`)}
                </Text>
                <Text
                  style={[
                    typography.label.small,
                    { color: colors.label.neutral },
                  ]}
                >
                  {String(count)}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: GUTTER, paddingVertical: SECTION_GAP },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  bars: { gap: spacing[8] },
  track: {
    height: BAR_HEIGHT,
    borderRadius: radius.sm,
    justifyContent: "center",
    overflow: "hidden",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  trackContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[12],
  },
  label: { flex: 1 },
})

/**
 * "오늘 1회 남음". 잠긴 기능 **옆**에 붙는 작은 표시.
 *
 * ## 왜 잔량을 미리 보여 주는가
 *
 * 다 쓴 뒤에야 페이월로 막으면 사용자는 "되던 게 갑자기 안 된다" 로 읽는다. 남은
 * 횟수가 보이면 그건 **정해진 규칙**이 되고, 규칙은 고장이 아니다.
 *
 * ## 아무것도 안 그리는 경우가 셋이다
 *
 *  1. 무제한(구독자) — 잔량이라는 개념이 없다.
 *  2. 아직 모른다(로딩·오류) — **0 으로 그리지 않는다.** 잠깐 "0회 남음" 이 떴다가
 *     사라지는 것이 아무것도 안 보이는 것보다 나쁘다.
 *  3. 셀 수 없는 총량형(`used: null`) — 소유 도메인이 개수를 못 세는 상태다.
 */

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Text, useV2Theme, spacing, radius } from "@/src/design-system-v2"
import type { FeatureAccess } from "../hooks/useFeatureAccess"

export function QuotaBadge({ access }: { access: FeatureAccess }) {
  const { t } = useTranslation("billing")
  const { colors } = useV2Theme()

  if (access.isLoading) return null
  if (access.remaining === null || access.limit === null) return null

  const exhausted = access.remaining <= 0
  const label = exhausted
    ? t("quota.exhausted")
    : access.resetsAt === null
      ? t("quota.remainingCap", { remaining: access.remaining })
      : // 기간 축은 서버가 주지만 여기서는 한도로 갈라도 문구가 맞는다(일 1회 · 월 10회).
        t(access.limit <= 1 ? "quota.remainingDay" : "quota.remainingMonth", {
          remaining: access.remaining,
        })

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: exhausted
            ? colors.fill.alternative
            : colors.primary.primaryWeak,
        },
      ]}
    >
      <V2Text
        token="subtext.small"
        color={exhausted ? colors.label.assistive : colors.primary.primary}
      >
        {label}
      </V2Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: radius.xs,
  },
})

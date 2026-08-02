/**
 * 영업 상태 한 줄. `영업중 21:30까지` / `영업전 11:00 오픈` / `휴무일` …
 *
 * ## 판정을 다시 하지 않는다
 *
 * 상태는 서버가 KST 로 계산해 내려준 값이고, 이 컴포넌트는 `useBusinessStatus` 가 만든
 * 문구·색을 그린다. 기기 시계로 다시 계산하면 시계가 틀린 사용자에게 영업중인 가게가
 * 휴무로 보인다.
 *
 * ## `DAY_OFF` 에 마감 시각을 붙이지 않는다 (프로토타입 버그)
 *
 * 프로토타입은 휴무일에도 `${closeTime}까지` 를 붙여 "휴무일 21:30까지" 를 출력했다.
 * 문 닫은 날의 마감 시각은 뜻이 없다. 그 분기는 `utils/businessStatus` 가 막고 있고
 * 여기서는 그 결과를 그대로 신뢰한다 — 폴백을 새로 만들지 말 것.
 *
 * ## 보조 문구의 `day` 는 값이 아니라 i18n 키다
 *
 * `nextOpen` 의 `day` 파라미터에는 `restaurant.weekday.WED` 같은 **키**가 들어온다
 * (유틸이 로케일을 모르므로). 그대로 보간하면 화면에 키 문자열이 찍히니 여기서 한 번 더
 * `t()` 를 통과시킨다.
 *
 * ## 라스트오더는 상태와 독립이다
 *
 * `영업중 21:30까지 · 라스트오더 21:00` 처럼 상태 문구 뒤에 별 조각으로 붙는다. 상태
 * 분기에 섞으면 브레이크타임·영업전에서 라스트오더가 사라진다 — 그 정보는 상태와 무관하게
 * 유용하다.
 */

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { BusinessStatusCode, Weekday } from "../types"
import { useBusinessStatus } from "../hooks/useBusinessStatus"

export interface BusinessStatusTextProps {
  status: BusinessStatusCode
  /** `HH:MM`. `OPEN` 일 때의 마감 시각. */
  closingTime?: string | null
  /** `HH:MM`. `BEFORE_OPEN` 일 때의 오픈 시각. */
  openingTime?: string | null
  /**
   * `HH:MM`. 브레이크타임 **시작** 시각. `nextTransitionAt` 과 함께 있을 때만
   * `영업중 · 15:00에 브레이크타임` 을 만든다(utils/businessStatus 의 `OPEN` 분기).
   */
  breakStartTime?: string | null
  /** `HH:MM`. `BREAK_TIME` 종료 시각. */
  breakEndTime?: string | null
  /** `HH:MM`. 라스트오더. 상태와 무관하게 별 조각으로 붙는다. */
  lastOrder?: string | null
  /** 휴무일일 때 다음 영업 요일. */
  nextOpenWeekday?: Weekday | null
  /** 휴무일일 때 다음 영업 시작 시각(`HH:MM`). */
  nextOpenTime?: string | null
  /** 다음 전환 시각(ISO). 그 시각에 딱 한 번 깨어나 표시를 흐리게 한다. */
  nextTransitionAt?: string | null
  style?: ViewStyle
}

export function BusinessStatusText({
  status,
  closingTime = null,
  openingTime = null,
  breakStartTime = null,
  breakEndTime = null,
  lastOrder = null,
  nextOpenWeekday = null,
  nextOpenTime = null,
  nextTransitionAt = null,
  style,
}: BusinessStatusTextProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { view, isStale } = useBusinessStatus({
    status,
    closingTime,
    openingTime,
    breakStartTime,
    breakEndTime,
    nextOpenWeekday,
    nextOpenTime,
    nextTransitionAt,
  })

  const label = t(dynamicKey(view.labelKey))
  const sub = view.subLabelKey
    ? // 요일은 키로 넘어오므로 한 번 더 번역한다(파일 상단 주석).
      t(dynamicKey(view.subLabelKey), {
        ...view.subParams,
        ...(view.subParams?.day
          ? { day: t(dynamicKey(view.subParams.day)) }
          : null),
      })
    : null
  const lastOrderText = lastOrder
    ? t("restaurant.businessStatus.lastOrder", { time: lastOrder })
    : null

  const accessibilityLabel = [label, sub, lastOrderText]
    .filter((part): part is string => Boolean(part))
    .join(" ")

  /*
    상태와 그 다음 사건 사이에 가운뎃점을 넣는다.

    공백만으로 이었을 때 `영업중 15:00에 브레이크타임` 은 "15시에 영업중" 처럼 한 덩어리로
    읽혔다. 두 조각은 서로 다른 사실(지금 상태 / 다음 전환)이므로 눈에 보이는 구분자가
    필요하다. 색·굵기로만 나누면 스크린리더에는 그 경계가 전달되지 않는다.
  */
  const dot = t("restaurant.metaDot")

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      // 전환 시각이 지났으면 값이 더 이상 정확하지 않다. 지우지 않고 흐리게 둔다 —
      // 지우면 카드 높이가 흔들리고, 사용자는 정보가 사라진 이유를 모른다.
      style={[styles.row, isStale && styles.stale, style]}
    >
      <Text style={[typography.label.smallWeak, { color: view.color }]}>
        {label}
      </Text>
      {sub !== null && (
        <>
          <Text
            // 구분자는 정보가 아니다. 스크린리더가 "가운뎃점" 을 읽지 않게 숨긴다.
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              typography.subtext.large,
              { color: colors.label.assistive },
            ]}
          >
            {dot}
          </Text>
          <Text
            style={[typography.subtext.large, { color: colors.label.neutral }]}
            numberOfLines={1}
          >
            {sub}
          </Text>
        </>
      )}
      {lastOrderText !== null && (
        <>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              typography.subtext.medium,
              { color: colors.label.assistive },
            ]}
          >
            {dot}
          </Text>
          <Text
            style={[
              typography.subtext.medium,
              { color: colors.label.alternative },
            ]}
            numberOfLines={1}
          >
            {lastOrderText}
          </Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    // 라스트오더까지 붙으면 좁은 화면에서 감긴다. 잘라 버리지 않는다.
    flexWrap: "wrap",
    gap: spacing[4],
  },
  stale: { opacity: 0.4 },
})

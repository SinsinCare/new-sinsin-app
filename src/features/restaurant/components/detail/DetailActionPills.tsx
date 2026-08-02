/**
 * 상세의 **액션 pill 행**: `[진단하기] [전화] [공유] [저장]`.
 *
 * ```
 * 868식당
 * 한식 · ★ 4.9 · 리뷰 8
 * [✨ 진단하기] [☎ 전화] [↗ 공유] [🔖 저장]   ← 가로 스크롤
 * ```
 *
 * ## 왜 제목 바로 아래인가
 *
 * 예전에는 이 네 가지가 화면 **맨 아래 바에만** 있었고, 그중 셋은 라벨 없는 아이콘이었다.
 * 무엇을 할 수 있는 곳인지가 제목 옆에서 읽히지 않았다. 네이버 지도 장소 상세는 같은
 * 액션을 제목 바로 아래 가로 스크롤 pill 행에 두고, 스크롤해서 지나가면 그 행을 하단에
 * 고정한다. 우리도 같은 구조를 쓴다 — 다만 **버튼의 내용은 우리 것**이다
 * (`출발`/`도착`/`예약` 은 우리에게 없는 기능이라 만들지 않는다).
 *
 * ## 주요 액션은 하나뿐이다
 *
 * `진단하기` 만 채움(브랜드 오렌지)이고 나머지는 아웃라인이다. 우리가 이 화면에서
 * 유일하게 남들이 못 하는 일이 개인 기준 대조이므로, 그것 하나만 눈에 띄어야 한다.
 * 둘 이상을 채우면 어느 것이 이 화면의 목적인지 사라진다.
 *
 * ## 저장 상태는 색이 아니라 아이콘 면으로 말한다
 *
 * 저장된 pill 은 채움으로 바뀌지 않는다(그러면 주요 액션이 둘이 된다). 대신 북마크
 * 아이콘이 비어 있던 것에서 **채워지고** 라벨이 `저장` → `저장됨` 으로 바뀐다. 색맹
 * 사용자에게도 형태와 글자 두 갈래로 전달된다.
 *
 * ## 이 컴포넌트는 상태를 갖지 않는다
 *
 * 히어로 안과 하단 고정 두 곳에서 **같은 인스턴스 모양**으로 그려진다. 두 곳이 각자
 * 상태를 들면 위에서 저장한 것이 아래에 반영되지 않는다.
 */

import type { ComponentProps } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"

import {
  borderWidth,
  controlHeight,
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
  type V2IconName,
} from "@/src/design-system-v2"

import { CHIP_GAP, RAIL_INSET } from "../../layout"

export interface DetailAction {
  /** React key 이자 분석용 이름. */
  key: string
  label: string
  icon: V2IconName
  /** 채움은 화면당 하나여야 한다(머리말 참고). */
  emphasis: "primary" | "secondary"
  /** 켜짐 상태를 갖는 액션(저장)만 쓴다. */
  selected?: boolean
  onPress: () => void
}

export interface DetailActionPillsProps {
  actions: DetailAction[]
  style?: StyleProp<ViewStyle>
  /** 세로 여백. 히어로 안과 하단 고정 바에서 값이 다르다. */
  contentStyle?: StyleProp<ViewStyle>
}

export function DetailActionPills({
  actions,
  style,
  contentStyle,
}: DetailActionPillsProps) {
  if (actions.length === 0) return null

  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      // 오른쪽 인셋은 `contentContainerStyle` 쪽이다 — 컨테이너에 주면 스크롤 끝에서
      // 잘려 마지막 pill 이 화면 모서리에 붙는다(layout.ts `RAIL_INSET` 머리말).
      contentContainerStyle={[styles.content, contentStyle]}
      style={style}
    >
      {actions.map((action) => (
        <ActionPill key={action.key} action={action} />
      ))}
    </ScrollView>
  )
}

function ActionPill({ action }: { action: DetailAction }) {
  const { colors } = useV2Theme()
  const filled = action.emphasis === "primary"

  const foreground = filled
    ? colors.static.white
    : action.selected
      ? colors.primary.primary
      : colors.label.normal

  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: false, selected: action.selected }}
      accessibilityLabel={action.label}
      style={({ pressed }) => [
        styles.pill,
        filled
          ? { backgroundColor: colors.primary.primary }
          : {
              backgroundColor: colors.background.default,
              borderWidth: borderWidth.thin,
              borderColor: action.selected
                ? colors.primary.primary
                : colors.line.normal,
            },
        pressed && styles.pressed,
      ]}
    >
      <V2Icon name={action.icon} size={iconSize.sm} color={foreground} />
      <Text style={[typography.label.small, { color: foreground }]}>
        {action.label}
      </Text>
    </Pressable>
  )
}

/**
 * 하단에 고정될 때의 껍데기. 위쪽 머리카락 선 + 배경을 여기서 준다 —
 * pill 자체가 배경을 갖지 않으므로 고정 상태에서 본문이 pill 사이로 비쳐 보이면 안 된다.
 */
export function DetailActionBar({
  actions,
  paddingBottom,
  onLayout,
  pointerEvents,
  style,
}: {
  actions: DetailAction[]
  paddingBottom: number
  onLayout?: ComponentProps<typeof View>["onLayout"]
  /** 숨겨 둔 동안 `"none"`. 투명한 바가 본문의 마지막 줄을 가로채지 않게 한다. */
  pointerEvents?: ComponentProps<typeof View>["pointerEvents"]
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useV2Theme()
  return (
    <View
      onLayout={onLayout}
      pointerEvents={pointerEvents}
      style={[
        styles.bar,
        {
          paddingBottom,
          backgroundColor: colors.background.default,
          borderTopColor: colors.line.neutral,
        },
        style,
      ]}
    >
      <DetailActionPills actions={actions} />
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    paddingHorizontal: RAIL_INSET,
  },
  /**
   * 좌우 `12`, 아이콘-라벨 `4`. **넉넉해 보이는 16/6 으로 되돌리지 말 것** — 실측 근거가 있다.
   *
   * 16/6 일 때 iPhone 17e(390pt)에서 네 pill 의 내용 폭이 **424pt** 라 뷰포트를 **34pt 넘쳤고**,
   * 마지막 `저장` 이 오른쪽 화면 밖으로 잘렸다. 잘린 쪽은 히어로 행과 하단 고정 바 **양쪽**이다.
   * 12/4 로 줄이면 **384pt** 가 되어 6pt 여유로 들어온다(둘 다 `onContentSizeChange` 로 측정).
   *
   * ## 그래도 ScrollView 를 남기는 이유
   *
   * 여유가 6pt 뿐이라 항상 들어온다고 볼 수 없다. 저장하면 라벨이 `저장` → `저장됨` 으로
   * 한 글자 늘고, 영어(`Diagnose`/`Share`/`Saved`)는 더 길다. 그때는 다시 넘치는 것이 맞고,
   * 가로 스크롤이 그 경우의 안전판이다. 넘침을 **기본 상태에서 없애는 것**이 목적이지
   * 스크롤을 없애는 것이 목적이 아니다.
   *
   * 즉 이 값들은 취향이 아니라 **뷰포트 폭에 묶여 있다.** 라벨을 추가하거나 pill 을 하나 더
   * 늘리면 다시 재야 한다.
   */
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    minHeight: controlHeight.md,
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
  },
  bar: {
    paddingTop: spacing[12],
    borderTopWidth: borderWidth.thin,
  },
  // 버튼·칩과 같은 눌림 값.
  pressed: { opacity: 0.85 },
})

/**
 * "레시피 작성" 플로팅. 시안에서 이 버튼이 **카드를 가렸고**, 실제 앱에서는 전역
 * `AI 상담` 필과 같은 자리에 쌓여 있었다(계약 §6.1 "스크롤 내리면 축소, AI 상담 과
 * 겹치지 않게 스택 정리").
 *
 * 고친 것 두 가지.
 *
 * 1) **겹침** — 좌표계를 못 박았다. `FloatingAiButton` 은 탭 레이아웃이 루트에
 *    `bottom = insets.bottom + TAB_BAR_HEIGHT + FLOATING_AI_BUTTON_BOTTOM` 으로 얹는다.
 *    이 화면의 내용 영역은 탭바 **위**에서 끝나므로, 화면 기준으로 AI 필은
 *    `16 ~ 16+48 = 64` 구간을 차지한다(insets·탭바 항이 상쇄된다). 그래서 이 버튼은
 *    64 + 여백 14 = 78 에서 시작한다. 상수 산술을 주석에 남기지 않으면 다음 사람이
 *    탭바 높이를 한 번 더 더하거나 빼서 다시 겹친다.
 *
 * 2) **가림** — 스크롤을 내리면 라벨을 접고 지름 48 원으로 줄인다. 폭을 하드코딩하지
 *    않고 펼친 상태를 한 번 재서 그 값으로 애니메이션한다 — 라벨이 로케일마다 길이가
 *    달라서(ko "레시피 작성" / en "Write a recipe") 고정 폭을 쓰면 글자가 잘린다.
 */
import { useEffect, useState } from "react"
import { Pressable, StyleSheet } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"

import { hapticSelection } from "@/src/lib/haptics"
import { Icon } from "@/src/shared/components/Icon"
import {
  FLOATING_AI_BUTTON_BOTTOM,
  FLOATING_AI_BUTTON_HEIGHT,
} from "@/src/shared/components/FloatingAiButton"
import { MOTION } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"

/** 접힌 상태의 지름. AI 필과 같은 높이라 두 플로팅의 리듬이 맞는다. */
const COLLAPSED_SIZE = 48

/** AI 필 위에 쌓는 자리. 위 주석의 산술 그대로. */
export const RECIPE_WRITE_FAB_BOTTOM =
  FLOATING_AI_BUTTON_BOTTOM + FLOATING_AI_BUTTON_HEIGHT + 14

/** 목록 바닥에 비워 둘 높이 — 마지막 카드가 두 플로팅에 영구히 가리지 않게. */
export const RECIPE_LIST_BOTTOM_SPACER =
  RECIPE_WRITE_FAB_BOTTOM + COLLAPSED_SIZE + 16

const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

interface RecipeWriteFabProps {
  label: string
  collapsed: boolean
  onPress: () => void
}

export function RecipeWriteFab({
  label,
  collapsed,
  onPress,
}: RecipeWriteFabProps) {
  const [expandedWidth, setExpandedWidth] = useState<number | null>(null)
  const width = useSharedValue(0)
  const labelOpacity = useSharedValue(1)
  const scale = useSharedValue(1)

  useEffect(() => {
    if (expandedWidth == null) return
    width.value = withTiming(collapsed ? COLLAPSED_SIZE : expandedWidth, {
      duration: MOTION.duration.base,
    })
    labelOpacity.value = withTiming(collapsed ? 0 : 1, {
      duration: MOTION.duration.fast,
    })
  }, [collapsed, expandedWidth, labelOpacity, width])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    // 폭을 재기 전에는 내용 폭 그대로 둔다(첫 프레임에 0 으로 찌그러지지 않게).
    ...(expandedWidth == null ? null : { width: width.value }),
  }))

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }))

  return (
    <Animated.View style={[styles.wrap, containerStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          scale.value = withSpring(0.94, SPRING)
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING)
        }}
        onPress={() => {
          hapticSelection()
          onPress()
        }}
        onLayout={(event) => {
          if (expandedWidth != null) return
          const measured = Math.ceil(event.nativeEvent.layout.width)
          if (measured <= 0) return
          setExpandedWidth(measured)
          width.value = measured
        }}
        style={styles.pill}
      >
        <Icon name="pencil" size={18} color="#FFFFFF" />
        <Animated.Text
          style={[styles.label, labelStyle]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    bottom: RECIPE_WRITE_FAB_BOTTOM,
    borderRadius: COLLAPSED_SIZE / 2,
    // 접힐 때 라벨이 밖으로 삐져나오지 않게 자른다.
    overflow: "hidden",
    backgroundColor: tokens.color.primary.val,
    // 플로팅은 그림자리스 규칙의 예외다 — 떠 있음은 그림자만이 말할 수 있다.
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.22,
    elevation: 8,
  },
  pill: {
    height: COLLAPSED_SIZE,
    minWidth: COLLAPSED_SIZE,
    paddingLeft: 15,
    paddingRight: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})

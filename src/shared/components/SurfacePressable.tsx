import type { ReactNode } from "react"
import {
  Pressable,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"

import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { MOTION } from "@/src/theme/surface"
import { childrenShapeKey } from "./childrenShapeKey"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/**
 * 면을 가진 인터랙션의 공용 프레서블 — 홈 기록 행과 같은 문법.
 * 누르면 면이 pressed 톤으로 가라앉으며 살짝 눌리고, 떼면 스프링으로 돌아온다.
 * 그림자·보더 없이 면과 움직임으로만 반응을 말한다.
 */
export function SurfacePressable({
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  style,
  children,
  haptic = true,
  baseColor,
  pressedColor,
  pressScale = 0.985,
}: {
  onPress: () => void
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityState?: { selected?: boolean; disabled?: boolean }
  hitSlop?: number | Insets
  style?: StyleProp<ViewStyle>
  children: ReactNode
  haptic?: boolean
  /** 기본 면 색. 생략하면 카드 면. */
  baseColor?: string
  /** 눌린 면 색. 생략하면 surfacePressed. */
  pressedColor?: string
  /** 눌렸을 때 스케일. 필·아이콘처럼 작은 대상은 더 깊게 준다. */
  pressScale?: number
}) {
  const surface = useSurface()
  const press = useSharedValue(0)
  const base = baseColor ?? surface.card
  const pressed = pressedColor ?? surface.surfacePressed

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(press.value, [0, 1], [base, pressed]),
    transform: [{ scale: 1 - press.value * (1 - pressScale) }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        accessibilityState ?? (disabled ? { disabled } : undefined)
      }
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => {
        if (haptic) hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        press.value = withTiming(1, {
          duration: 90,
          easing: EASE,
          reduceMotion: ReduceMotion.System,
        })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
    >
      {/* key: 자식 구성이 통째로 바뀌면 리마운트 — childrenShapeKey 머리말 참고.
          안드로이드 릴리즈에서 살아 있는 Animated.View 의 자식 전면 교체가
          그려지지 않는 것을 래퍼가 직접 막는다. 콜사이트는 아무것도 몰라도 된다. */}
      <Animated.View
        key={childrenShapeKey(children)}
        style={[style, animatedStyle]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}

import type { ReactNode } from "react"
import { Pressable, type StyleProp, type ViewStyle } from "react-native"
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
import { childrenShapeKey } from "@/src/shared/components/childrenShapeKey"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/**
 * 기록 행·리스트 아이템의 공용 프레서블. 온보딩 선택 행과 같은 문법 —
 * 누르면 0.985 로 눌리고 면이 pressed 톤으로 가라앉았다가 스프링으로 돌아온다.
 * 그림자·보더 없이 면과 움직임으로만 반응을 말한다.
 */
export function RecordRowPressable({
  onPress,
  accessibilityLabel,
  style,
  children,
  haptic = true,
  tone = "surface",
  baseColor: baseColorOverride,
}: {
  onPress: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  children: ReactNode
  haptic?: boolean
  /** 바닥 면. 회색 바닥 위 흰 카드는 "card", 흰 바닥 위 회색 행은 "surface". */
  tone?: "surface" | "card"
  /** 특수 면(브랜드 틴트 등)이 필요할 때 톤 대신 직접 준다. */
  baseColor?: string
}) {
  const surface = useSurface()
  const press = useSharedValue(0)
  const baseColor =
    baseColorOverride ??
    (tone === "card" ? surface.card : surface.surfaceSunken)

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      press.value,
      [0, 1],
      [baseColor, surface.surfacePressed],
    ),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
      {/* key: 자식 구성이 통째로 바뀌면 리마운트 — childrenShapeKey 머리말 참고. */}
      <Animated.View
        key={childrenShapeKey(children)}
        style={[style, animatedStyle]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}

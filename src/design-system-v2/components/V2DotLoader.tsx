// Design System v2 — Dot Loader
//
// 스켈레톤을 그릴 수 없는 자리(버튼 라벨 위, 알약 버튼 안, 짧은 인라인 상태)에서
// 링 스피너를 대신한다. 링은 "시스템이 멈춰 있다" 는 인상을 주고 플랫폼 기본 위젯
// 그대로라 브랜드가 없다. 점 세 개는 라벨 자리에 그대로 들어가 버튼 크기를 유지한다.
//
// ## 위상 하나로 세 점
//
// shared value 는 하나(0→1 반복)만 두고 점마다 위상만 밀어 파도를 만든다.
// 점마다 애니메이션을 따로 걸면 같은 리듬을 세 번 계산하게 된다.
//
// reduce-motion 이면 파도를 멈추고 점 세 개를 고르게 남긴다 — 자리 표시는 유지된다.

import { useEffect } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { useV2Theme } from "../hooks/useV2Theme"

/** 파도가 한 바퀴 도는 시간. 점 사이 위상차는 이 값의 1/6씩. */
const CYCLE_MS = 900
const PHASE = 1 / 6

export type V2DotLoaderSize = "s" | "m" | "l"

export type V2DotLoaderProps = {
  size?: V2DotLoaderSize
  /** 점 색. 기본은 label.neutral — 버튼 위에서는 글자색을 그대로 넘겨 준다 */
  color?: string
  style?: StyleProp<ViewStyle>
}

const DOT = { s: 4, m: 6, l: 8 } as const

export function V2DotLoader({ size = "m", color, style }: V2DotLoaderProps) {
  const { colors } = useV2Theme()
  const reduced = useReducedMotion()
  const progress = useSharedValue(0)
  const diameter = DOT[size]
  const tint = color ?? colors.label.neutral

  useEffect(() => {
    if (reduced) return
    progress.value = 0
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
    )
    return () => cancelAnimation(progress)
  }, [progress, reduced])

  return (
    <View
      accessibilityRole="progressbar"
      style={[styles.row, { gap: diameter }, style]}
    >
      {[0, 1, 2].map((index) => (
        <Dot
          key={index}
          index={index}
          diameter={diameter}
          color={tint}
          progress={progress}
          reduced={reduced}
        />
      ))}
    </View>
  )
}

type DotProps = {
  index: number
  diameter: number
  color: string
  progress: ReturnType<typeof useSharedValue<number>>
  reduced: boolean
}

function Dot({ index, diameter, color, progress, reduced }: DotProps) {
  const animated = useAnimatedStyle(() => {
    // 위상을 밀고 0~1 로 되감아 점마다 파도의 다른 지점을 보게 한다.
    const phased = (progress.value + index * PHASE) % 1
    return {
      opacity: interpolate(phased, [0, 0.5, 1], [0.3, 1, 0.3]),
      transform: [{ scale: interpolate(phased, [0, 0.5, 1], [0.72, 1, 0.72]) }],
    }
  })

  const shape = {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    backgroundColor: color,
  }

  if (reduced) return <View style={[shape, { opacity: 0.6 }]} />
  return <Animated.View style={[shape, animated]} />
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
})

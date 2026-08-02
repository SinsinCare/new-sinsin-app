// Design System v2 — Skeleton
//
// 링 스피너를 대체하는 기본 로딩 표현. "무엇이 오는지" 를 미리 그려 두면
// 도착 순간 레이아웃이 튀지 않고, 체감 대기가 짧아진다.
//
// ## 리듬은 앱 전체가 하나
//
// 시머(빛 쓸림)는 모듈 레벨 shared value 하나가 몬다. 화면에 스켈레톤이 30개 있어도
// UI 스레드 애니메이션은 1개고, 서로 다른 카드의 빛이 같은 위상으로 지나간다.
// 각자 useSharedValue 를 돌리면 위상이 어긋나 화면이 반짝이는 노이즈가 된다.
//
// 마운트 수를 세서 마지막 스켈레톤이 사라지면 애니메이션을 멈춘다 —
// 로딩이 끝난 뒤에도 빈 드라이버가 매 프레임 도는 걸 막는다.
//
// ## 접근성
//
// 회색 막대의 모양을 스크린리더가 읽을 이유는 없다. 그룹만 progressbar 로 알리고
// 내부는 통째로 숨긴다. reduce-motion 이 켜져 있으면 시머 없이 정적인 면만 남는다.

import { useEffect, useState, type ReactNode } from "react"
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { radius as radiusToken, spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

/** 빛이 막대 하나를 통과하는 데 걸리는 시간. 느리면 멈춘 듯, 빠르면 초조하다. */
const SWEEP_MS = 1150

/**
 * 앱 전체가 공유하는 시머 위상 (0 → 1 반복). 훅이 아니라 모듈 값인 게 핵심.
 *
 * 만드는 시점은 **첫 렌더**다. 모듈이 평가되는 순간(= 번들 로드 중)에 만들면 이 파일을
 * 들여오는 순서에 따라 reanimated 초기화보다 앞설 수 있고, 그러면 앱이 부팅하지 못한다.
 * 첫 렌더는 언제나 초기화 이후다.
 */
let sweep: ReturnType<typeof makeMutable<number>> | null = null
let sweepRefCount = 0

function getSweep() {
  if (!sweep) sweep = makeMutable(0)
  return sweep
}

function acquireSweep() {
  sweepRefCount += 1
  if (sweepRefCount > 1) return
  const shared = getSweep()
  shared.value = 0
  shared.value = withRepeat(
    withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }),
    -1,
  )
}

function releaseSweep() {
  sweepRefCount = Math.max(0, sweepRefCount - 1)
  if (sweepRefCount > 0 || !sweep) return
  cancelAnimation(sweep)
  sweep.value = 0
}

/** reduce-motion 이면 드라이버를 붙잡지 않는다 (애니메이션 자체가 안 도니까). */
function useSweepDriver(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    acquireSweep()
    return releaseSweep
  }, [enabled])
}

export type V2SkeletonRadius = keyof typeof radiusToken

export type V2SkeletonProps = {
  /** 기본 '100%' — 부모 폭을 채운다 */
  width?: number | `${number}%`
  /** 기본 16 (본문 한 줄 높이) */
  height?: number
  radius?: V2SkeletonRadius
  style?: StyleProp<ViewStyle>
}

/**
 * 회색 면 하나. 실제 콘텐츠의 자리와 크기를 그대로 흉내 내는 데 쓴다.
 * @example <V2Skeleton width={120} height={20} radius="sm" />
 */
export function V2Skeleton({
  width = "100%",
  height = 16,
  radius = "xs",
  style,
}: V2SkeletonProps) {
  const { colors, mode } = useV2Theme()
  const reduced = useReducedMotion()
  const animated = !reduced
  // 시머 이동 거리는 막대의 실제 폭에서 나온다. 레이아웃 전(0)에는 면만 보인다.
  const [measured, setMeasured] = useState(0)
  // 한 번 만들어지면 앱이 끝날 때까지 같은 참조다 — 워크릿이 매 렌더 다시 캡처하지 않는다.
  const shared = getSweep()

  useSweepDriver(animated)

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width)
    setMeasured((prev) => (prev === next ? prev : next))
  }

  const band = Math.max(72, measured * 0.6)
  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -band + shared.value * (measured + band) }],
  }))

  // 라이트 모드의 면(#70737c14)은 이미 아주 옅어서, 빛은 "더 밝게" 만들어야 보인다.
  // 다크에서 같은 알파를 쓰면 흰 줄이 튀므로 훨씬 약하게 깐다.
  const highlight =
    mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.62)"

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          width,
          height,
          borderRadius: radiusToken[radius],
          backgroundColor: colors.fill.normal,
        },
        styles.clip,
        style,
      ]}
    >
      {animated && measured > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, bandStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", highlight, "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: band, height: "100%" }}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}

export type V2SkeletonTextProps = {
  /** 줄 수. 기본 2 */
  lines?: number
  /** 한 줄 높이. 기본 16 */
  lineHeight?: number
  /** 줄 간격. 기본 spacing[8] */
  gap?: number
  /** 마지막 줄 폭 — 문단은 끝이 꽉 차지 않는다. 기본 '62%' */
  lastLineWidth?: `${number}%`
  style?: StyleProp<ViewStyle>
}

/**
 * 문단 자리. 마지막 줄만 짧게 끊어 실제 텍스트처럼 보이게 한다.
 * @example <V2SkeletonText lines={3} />
 */
export function V2SkeletonText({
  lines = 2,
  lineHeight = 16,
  gap = spacing[8],
  lastLineWidth = "62%",
  style,
}: V2SkeletonTextProps) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, index) => (
        <V2Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 && lines > 1 ? lastLineWidth : "100%"}
        />
      ))}
    </View>
  )
}

export type V2SkeletonCircleProps = {
  size: number
  style?: StyleProp<ViewStyle>
}

/** 아바타·아이콘 자리. */
export function V2SkeletonCircle({ size, style }: V2SkeletonCircleProps) {
  return <V2Skeleton width={size} height={size} radius="full" style={style} />
}

export type V2SkeletonGroupProps = {
  children: ReactNode
  /** 스크린리더 안내. 기본 '불러오는 중' */
  label?: string
  style?: StyleProp<ViewStyle>
}

/**
 * 스켈레톤 묶음의 겉포장. 도착할 때 뚝 끊기지 않게 페이드로 교대하고,
 * 스크린리더에는 "불러오는 중" 하나만 알린다.
 */
export function V2SkeletonGroup({
  children,
  label = "불러오는 중",
  style,
}: V2SkeletonGroupProps) {
  const reduced = useReducedMotion()

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      importantForAccessibility="no-hide-descendants"
      entering={reduced ? undefined : FadeIn.duration(140)}
      exiting={reduced ? undefined : FadeOut.duration(180)}
      style={style}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
})

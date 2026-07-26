import { useEffect } from "react"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack } from "tamagui"
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg"
import { AssistantAvatar } from "./ChatMessageBubble"

/**
 * SVG 그라디언트 offset 은 transform/opacity 가 아니라서 RN Animated 로는
 * useNativeDriver 를 못 씁니다. 즉 이 셔머는 JS 스레드에서 돌았는데,
 * 하필 답변 생성·응답 파싱으로 JS 스레드가 가장 바쁜 구간에 계속 돕니다.
 * reanimated 의 useAnimatedProps 로 옮기면 같은 그림을 UI 스레드에서 그립니다.
 */
const AnimatedStop = Animated.createAnimatedComponent(Stop)

const DURATION_MS = 2000

// 하이라이트가 왼쪽 밖에서 오른쪽 밖까지 지나가 루프 복귀(1→0)가 보이지 않습니다.
const STOPS = [
  { from: -0.6, to: 1.0 },
  { from: -0.3, to: 1.3 },
  { from: 0.0, to: 1.6 },
] as const

export function TypingIndicator() {
  const isDark = useAppColorScheme() === "dark"
  // bg: dark #1F1F21, light #F3F3F3
  const baseColor = isDark ? "#E0E0E0" : "#1A1A1A"
  const sweepColor = isDark ? "#666666" : "#999999"

  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    )
    return () => cancelAnimation(progress)
  }, [progress])

  const stop1Props = useAnimatedProps(() => ({
    offset: STOPS[0].from + (STOPS[0].to - STOPS[0].from) * progress.value,
  }))
  const stop2Props = useAnimatedProps(() => ({
    offset: STOPS[1].from + (STOPS[1].to - STOPS[1].from) * progress.value,
  }))
  const stop3Props = useAnimatedProps(() => ({
    offset: STOPS[2].from + (STOPS[2].to - STOPS[2].from) * progress.value,
  }))

  return (
    <XStack alignItems="center" paddingHorizontal="$4" gap="$3">
      <AssistantAvatar />
      <Svg height={22} width={250}>
        <Defs>
          <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
            <AnimatedStop animatedProps={stop1Props} stopColor={baseColor} />
            <AnimatedStop animatedProps={stop2Props} stopColor={sweepColor} />
            <AnimatedStop animatedProps={stop3Props} stopColor={baseColor} />
          </LinearGradient>
        </Defs>
        <SvgText
          fill="url(#shimmer)"
          fontSize={14}
          fontFamily="PretendardKR-Medium"
          y={16}
        >
          답변을 신중하게 고민하고 있어요
        </SvgText>
      </Svg>
    </XStack>
  )
}

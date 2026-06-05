import { useEffect, useRef } from "react"
import { Animated, Easing } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack } from "tamagui"
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg"
import { AssistantAvatar } from "./ChatMessageBubble"

const AnimatedStop = Animated.createAnimatedComponent(Stop)

export function TypingIndicator() {
  const isDark = useAppColorScheme() === "dark"
  // bg: dark #1F1F21, light #F3F3F3
  const baseColor = isDark ? "#E0E0E0" : "#1A1A1A"
  const sweepColor = isDark ? "#666666" : "#999999"

  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    )
    animation.start()
    return () => animation.stop()
  }, [anim])

  // Highlight sweeps from fully off-left to fully off-right
  // so the loop restart (1→0) is invisible (both states = base color)
  const stop1 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-0.6, 1.0],
  })
  const stop2 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-0.3, 1.3],
  })
  const stop3 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 1.6],
  })

  return (
    <XStack alignItems="center" paddingHorizontal="$4" gap="$3">
      <AssistantAvatar />
      <Svg height={22} width={250}>
        <Defs>
          <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
            <AnimatedStop offset={stop1} stopColor={baseColor} />
            <AnimatedStop offset={stop2} stopColor={sweepColor} />
            <AnimatedStop offset={stop3} stopColor={baseColor} />
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

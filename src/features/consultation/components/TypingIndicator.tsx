import { useEffect } from "react"
import { StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text } from "tamagui"
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

/**
 * 답변 생성 중 표시. 이전엔 SVG 그라디언트 셔머였는데, SVG <Stop>은
 * 호스트 뷰가 없어 새 아키텍처의 reanimated useAnimatedProps 가
 * "Cannot find host instance" 로 죽는다. 점 3개 펄스(호스트 뷰인
 * Animated.View 만 사용)로 바꿔 같은 "생각 중" 신호를 안전하게 낸다.
 */

const CYCLE_MS = 1200
const DOT_COUNT = 3

function PulseDot({
  progress,
  index,
  color,
}: {
  progress: SharedValue<number>
  index: number
  color: string
}) {
  const animatedStyle = useAnimatedStyle(() => {
    // 도트마다 1/3 주기씩 위상을 밀어 물결처럼 이어진다.
    const phase = (progress.value + (DOT_COUNT - index) / DOT_COUNT) % 1
    return {
      opacity: interpolate(phase, [0, 0.35, 0.7, 1], [0.25, 1, 0.25, 0.25]),
    }
  })
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, animatedStyle]}
    />
  )
}

export function TypingIndicator() {
  const { t } = useTranslation()
  const isDark = useAppColorScheme() === "dark"
  const textColor = isDark
    ? tokens.color.textDarkSub.val
    : tokens.color.textLightSub.val

  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(progress)
  }, [progress])

  // AI 답변과 같은 자리(전폭 왼끝·거터 20)에서 시작한다 — 아바타 없이.
  return (
    <XStack alignItems="center" paddingHorizontal={20}>
      <XStack alignItems="center" gap={8}>
        <Text
          fontSize={14}
          lineHeight={20}
          color={textColor}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.organizing")}
        </Text>
        <XStack alignItems="center" gap={4}>
          {Array.from({ length: DOT_COUNT }, (_, index) => (
            <PulseDot
              key={index}
              progress={progress}
              index={index}
              color={textColor}
            />
          ))}
        </XStack>
      </XStack>
    </XStack>
  )
}

const styles = StyleSheet.create({
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
})

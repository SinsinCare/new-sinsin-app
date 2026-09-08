import { useEffect } from "react"
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import { useConsultMotion } from "../hooks/useConsultMotion"

function ShimmerGlyph({
  glyph,
  position,
  progress,
  color,
  highlight,
}: {
  glyph: string
  position: number
  progress: SharedValue<number>
  color: string
  highlight: string
}) {
  const style = useAnimatedStyle(() => {
    const strength = Math.max(0, 1 - Math.abs(progress.value - position) / 0.22)
    return { color: interpolateColor(strength, [0, 1], [color, highlight]) }
  })
  return <Animated.Text style={style}>{glyph}</Animated.Text>
}

function ActiveShimmerText({ label }: { label: string }) {
  const { colors } = useV2Theme()
  const enabled = useConsultMotion(true)
  const progress = useSharedValue(-0.3)
  useEffect(() => {
    if (enabled) {
      progress.value = -0.3
      progress.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1500, easing: Easing.linear }),
          withDelay(700, withTiming(-0.3, { duration: 0 })),
        ),
        -1,
        false,
      )
    } else {
      cancelAnimation(progress)
      progress.value = -0.3
    }
    return () => cancelAnimation(progress)
  }, [enabled, progress])

  const glyphs = Array.from(label)
  return (
    <V2Text
      token="subtext.medium"
      color={colors.label.neutral}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      lineBreakStrategyIOS="hangul-word"
    >
      {enabled
        ? glyphs.map((glyph, index) => (
            <ShimmerGlyph
              key={index}
              glyph={glyph}
              position={index / Math.max(glyphs.length - 1, 1)}
              progress={progress}
              color={colors.label.neutral}
              highlight={colors.label.normal}
            />
          ))
        : label}
    </V2Text>
  )
}

/** Color-only glyph sweep: native text metrics/wrapping, no mask dependency or layout motion. */
export function ConsultShimmerText({
  label,
  active,
}: {
  label: string
  active: boolean
}) {
  const { colors } = useV2Theme()
  if (active) return <ActiveShimmerText label={label} />
  return (
    <V2Text
      token="subtext.medium"
      color={colors.label.neutral}
      lineBreakStrategyIOS="hangul-word"
    >
      {label}
    </V2Text>
  )
}

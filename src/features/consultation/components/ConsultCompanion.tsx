import { useEffect } from "react"
import { Image } from "expo-image"
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

/** Animate the existing character on the UI thread only while a request is active. */
export function ConsultCompanion({
  active = false,
  size = 36,
}: {
  active?: boolean
  size?: number
}) {
  const reduceMotion = useReducedMotion()
  const motion = useSharedValue(0)
  useEffect(() => {
    if (active && !reduceMotion) {
      motion.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      )
    } else {
      cancelAnimation(motion)
      motion.value = 0
    }
    return () => cancelAnimation(motion)
  }, [active, reduceMotion, motion])
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -2 * motion.value },
      { rotate: `${2 * motion.value}deg` },
    ],
  }))
  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      accessible={false}
    >
      <Image
        source={require("@/assets/images/home-record-character.png")}
        contentFit="contain"
        style={{ width: size, height: size }}
      />
    </Animated.View>
  )
}

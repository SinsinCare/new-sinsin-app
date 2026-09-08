import { useEffect, useState, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

/** Keeps the draft mounted while measured content folds on the UI thread. */
export function V2Disclosure({
  open,
  children,
}: {
  open: boolean
  children: ReactNode
}) {
  const height = useSharedValue(0)
  const progress = useSharedValue(open ? 1 : 0)
  const [measured, setMeasured] = useState(false)
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      reduceMotion: ReduceMotion.System,
    })
  }, [open, progress])
  const animated = useAnimatedStyle(() => ({
    height: height.value * progress.value,
    opacity: withTiming(open ? 1 : 0, {
      duration: open ? 200 : 140,
      reduceMotion: ReduceMotion.System,
    }),
  }))
  return (
    <Animated.View
      style={[styles.clip, measured ? animated : !open && styles.closed]}
      pointerEvents={open ? "auto" : "none"}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
    >
      <View
        collapsable={false}
        style={(measured || !open) && styles.measure}
        onLayout={(event) => {
          height.value = event.nativeEvent.layout.height
          setMeasured(true)
        }}
      >
        {children}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  closed: { height: 0, opacity: 0 },
  measure: { position: "absolute", top: 0, left: 0, right: 0 },
})

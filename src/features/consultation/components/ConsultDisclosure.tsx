import { useState, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { V2Icon, useV2Theme } from "@/src/design-system-v2"
import { useConsultMotion } from "../hooks/useConsultMotion"

/** Measured native content: no estimated max-height, clipping or JS animation loop. */
export function ConsultDisclosure({
  open,
  children,
}: {
  open: boolean
  children: ReactNode
}) {
  const motion = useConsultMotion(true)
  const height = useSharedValue(0)
  const [visited, setVisited] = useState(open)
  const style = useAnimatedStyle(() => ({
    height: withTiming(open ? height.value : 0, {
      duration: motion ? 220 : 0,
      easing: Easing.out(Easing.cubic),
    }),
    opacity: withTiming(open ? 1 : 0, {
      duration: motion ? (open ? 180 : 120) : 0,
    }),
  }))
  return (
    <Animated.View
      style={[styles.clip, style]}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      pointerEvents={open ? "auto" : "none"}
    >
      {(open || visited) && (
        <View
          style={styles.content}
          onLayout={(event) => {
            height.value = event.nativeEvent.layout.height
            if (!visited) setVisited(true)
          }}
        >
          {children}
        </View>
      )}
    </Animated.View>
  )
}

export function ConsultChevron({ open }: { open: boolean }) {
  const { colors } = useV2Theme()
  const motion = useConsultMotion(true)
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(open ? "180deg" : "0deg", {
          duration: motion ? 220 : 0,
        }),
      },
    ],
  }))
  return (
    <Animated.View style={style}>
      <V2Icon name="chevronDown" size={16} color={colors.label.neutral} />
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  content: { position: "absolute", top: 0, left: 0, right: 0 },
})

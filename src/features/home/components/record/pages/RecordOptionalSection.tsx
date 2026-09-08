import { useEffect, type ReactNode } from "react"
import { Keyboard, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Disclosure, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { FORM, MIN, S } from "./recordPageSpec"
import { RECORD_TIMING } from "./recordMotion"

/** Optional measurements keep their draft mounted while the form folds away. */
export function RecordOptionalSection({
  title,
  value,
  open,
  onChange,
  disabled,
  children,
}: {
  title: string
  value?: string
  open: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  children: ReactNode
}) {
  const s = useSurface(),
    progress = useSharedValue(open ? 1 : 0)
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, RECORD_TIMING)
  }, [open, progress])
  const arrow = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }))
  return (
    <View style={[styles.root, { borderColor: s.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => {
          hapticSelection()
          if (open) Keyboard.dismiss()
          onChange(!open)
        }}
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <V2Text style={[FORM.option, styles.title]} color={s.textStrong}>
          {title}
        </V2Text>
        {value && !open ? (
          <V2Text style={FORM.hint} color={s.text}>
            {value}
          </V2Text>
        ) : null}
        <Animated.View style={arrow}>
          <Ionicons name="chevron-down" size={18} color={s.text} />
        </Animated.View>
      </Pressable>
      <V2Disclosure open={open}>
        <View style={styles.body}>{children}</View>
      </V2Disclosure>
    </View>
  )
}
const styles = StyleSheet.create({
  root: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    minHeight: MIN.TOUCH + S[2],
    paddingVertical: S[3],
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
  },
  title: { flex: 1 },
  body: { paddingBottom: S[4], gap: S[2] },
})

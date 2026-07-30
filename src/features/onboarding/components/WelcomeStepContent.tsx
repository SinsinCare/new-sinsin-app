import { useEffect } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { hapticSelection } from "@/src/lib/haptics"
import { useAuthSurface } from "@/src/features/auth/hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_MOTION } from "@/src/features/auth/data/authSurface"

interface WelcomeStepContentProps {
  selectedValue: boolean | null
  onSelect: (hasCkd: boolean) => void
}

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const TIMING = {
  duration: AUTH_MOTION.duration.fast,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}
const SPRING = {
  damping: 15,
  stiffness: 260,
  reduceMotion: ReduceMotion.System,
}

function WelcomeCard({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const surface = useAuthSurface()
  const selection = useSharedValue(selected ? 1 : 0)
  const scale = useSharedValue(1)

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, TIMING)
  }, [selected, selection])

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [surface.surface, surface.surfaceBrand],
    ),
    transform: [{ scale: scale.value }],
  }))

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [surface.text, surface.brand],
    ),
  }))

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        if (!selected) hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        scale.value = withTiming(0.985, { duration: 90, easing: EASE })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING)
      }}
      style={styles.pressable}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.Text style={[styles.label, labelStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

export function WelcomeStepContent({
  selectedValue,
  onSelect,
}: WelcomeStepContentProps) {
  const { t } = useTranslation("auth")
  const options = [
    { hasCkd: true, label: t("onboarding.diagnosed") },
    { hasCkd: false, label: t("onboarding.notDiagnosed") },
  ] as const
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((option) => (
        <WelcomeCard
          key={String(option.hasCkd)}
          label={option.label}
          selected={selectedValue === option.hasCkd}
          onPress={() => onSelect(option.hasCkd)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  pressable: { flex: 1 },
  card: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AUTH_LAYOUT.radius.option,
  },
  label: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
    letterSpacing: -0.34,
    textAlign: "center",
  },
})

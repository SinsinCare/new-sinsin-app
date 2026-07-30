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
import { CheckCircle } from "@/src/features/auth/components"
import { hapticSelection } from "@/src/lib/haptics"
import { useAuthSurface } from "@/src/features/auth/hooks/useAuthSurface"
import {
  AUTH_LAYOUT,
  AUTH_MOTION,
  AUTH_TYPE,
} from "@/src/features/auth/data/authSurface"
import type { OnboardingValueOption } from "../types"

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

interface MultiStepContentProps {
  options: OnboardingValueOption[]
  selectedKeys: string[]
  onToggle: (key: string) => void
}

function MultiRow({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  const surface = useAuthSurface()
  const selection = useSharedValue(selected ? 1 : 0)
  const scale = useSharedValue(1)

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, TIMING)
  }, [selected, selection])

  const rowStyle = useAnimatedStyle(() => ({
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
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        hapticSelection()
        onToggle()
      }}
      onPressIn={() => {
        scale.value = withTiming(0.985, { duration: 90, easing: EASE })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING)
      }}
    >
      {/* 복수 선택은 체크를 남긴다 — "몇 개든 고를 수 있다"는 면 색만으로 안 읽힌다. */}
      <Animated.View style={[styles.row, rowStyle]}>
        <CheckCircle checked={selected} />
        <Animated.Text style={[styles.label, labelStyle]} numberOfLines={2}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

export function MultiStepContent({
  options,
  selectedKeys,
  onToggle,
}: MultiStepContentProps) {
  return (
    <View style={styles.list}>
      {options.map((option, index) => (
        <MultiRow
          key={`${index}-${option.key}`}
          label={option.value}
          selected={selectedKeys.includes(option.key)}
          onToggle={() => onToggle(option.key)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    minHeight: AUTH_LAYOUT.optionHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: AUTH_LAYOUT.radius.option,
  },
  label: {
    ...AUTH_TYPE.option,
    flex: 1,
    fontWeight: "600",
  },
})

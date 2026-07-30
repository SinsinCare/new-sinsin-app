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
import Ionicons from "@expo/vector-icons/Ionicons"
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

interface OnlyStepContentProps {
  options: OnboardingValueOption[]
  selectedKeys: string[]
  onSelect: (key: string) => void
}

function OptionRow({
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
    >
      {/* 라디오 동그라미를 빼고 면 색과 오른쪽 체크로만 말한다. 원 + 테두리 + 배경 +
          글자색을 한꺼번에 바꾸면 같은 사실을 네 번 그리는 셈이다. */}
      <Animated.View style={[styles.row, rowStyle]}>
        <Animated.Text style={[styles.label, labelStyle]} numberOfLines={2}>
          {label}
        </Animated.Text>
        {selected && (
          <Ionicons name="checkmark" size={20} color={surface.brand} />
        )}
      </Animated.View>
    </Pressable>
  )
}

export function OnlyStepContent({
  options,
  selectedKeys,
  onSelect,
}: OnlyStepContentProps) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {options.map((option, index) => (
        <OptionRow
          key={`${index}-${option.key}`}
          label={option.value}
          selected={selectedKeys.includes(option.key)}
          onPress={() => onSelect(option.key)}
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
    justifyContent: "space-between",
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

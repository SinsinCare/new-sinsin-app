import { useEffect } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Animated, {
  Easing,
  FadeInDown,
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
import type { OnboardingFollowUp, OnboardingValueOption } from "../types"

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
  /** 같은 스텝의 두 번째 축(투석·이식). 없으면 아무것도 그리지 않는다. */
  followUp?: OnboardingFollowUp | null
  followUpKey?: string | null
  onFollowUpSelect?: (key: string) => void
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

/**
 * 후속 질문의 칩 하나. 본 선택지(OptionRow)보다 **의도적으로 가볍다** — 같은 무게로
 * 그리면 화면에 질문이 두 개 있는 것처럼 읽히고, 그러면 스텝을 나눈 것과 다르지 않다.
 */
function FollowUpChip({
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

  const chipStyle = useAnimatedStyle(() => ({
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
      [surface.textMuted, surface.brand],
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
        scale.value = withTiming(0.97, { duration: 90, easing: EASE })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING)
      }}
    >
      <Animated.View style={[styles.chip, chipStyle]}>
        <Animated.Text style={[styles.chipLabel, labelStyle]} numberOfLines={1}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

export function OnlyStepContent({
  options,
  selectedKeys,
  onSelect,
  followUp,
  followUpKey,
  onFollowUpSelect,
}: OnlyStepContentProps) {
  const surface = useAuthSurface()
  // 본 질문에 답하기 전에는 후속 질문을 띄우지 않는다. 빈 화면에 질문 두 개를
  // 동시에 내미는 대신, 고르고 나면 아래에서 이어지도록 한다.
  const showFollowUp =
    followUp != null &&
    followUp.values.length > 0 &&
    selectedKeys.length > 0 &&
    onFollowUpSelect != null

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

      {showFollowUp && (
        <Animated.View
          entering={FadeInDown.duration(AUTH_MOTION.duration.fast)
            .easing(EASE)
            .reduceMotion(ReduceMotion.System)}
          style={styles.followUp}
        >
          <Text style={[styles.followUpTitle, { color: surface.textMuted }]}>
            {followUp.title}
          </Text>
          <View style={styles.chipRow} accessibilityRole="radiogroup">
            {followUp.values.map((option) => (
              <FollowUpChip
                key={option.key}
                label={option.value}
                selected={followUpKey === option.key}
                onPress={() => onFollowUpSelect(option.key)}
              />
            ))}
          </View>
        </Animated.View>
      )}
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
  // 선택지 목록과 후속 질문 사이는 항목 간격(10)보다 넉넉히 벌린다. 같은 간격이면
  // 후속 질문이 선택지 하나로 읽힌다.
  followUp: { marginTop: 12, gap: 10 },
  followUpTitle: { ...AUTH_TYPE.helper, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: AUTH_LAYOUT.radius.pill,
  },
  chipLabel: { ...AUTH_TYPE.helper, fontWeight: "600" },
})

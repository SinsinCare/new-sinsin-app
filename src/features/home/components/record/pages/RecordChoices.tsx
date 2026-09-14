import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { useEffect } from "react"
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { RECORD_SPRING, RECORD_TIMING } from "./recordMotion"
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { FORM, PAGE_X, S } from "./recordPageSpec"
import { recordChoiceColumns } from "./recordChoiceLayout"
import { recordFieldLabel } from "./recordInk"

/** Inline choices stay visible; wrap on narrow screens or with larger text. */
export function RecordChoices<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  columns: preferredColumns,
}: {
  options: { value: T; label: string; description?: string }[]
  value: T | null
  onChange: (value: T) => void
  disabled?: boolean
  /** 한 줄에 두고 싶은 열 수(별점 5개 등). 글자가 안 들어가면 기본 규칙으로 내려간다. */
  columns?: number
}) {
  const { width, fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const columns = recordChoiceColumns(
    options.map((option) => option.label),
    width - PAGE_X * 2,
    fontScale,
    preferredColumns,
  )
  const rows = Array.from(
    { length: Math.ceil(options.length / columns) },
    (_, i) => options.slice(i * columns, (i + 1) * columns),
  )
  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((option) => (
            <RecordChoice
              key={option.value}
              label={option.label}
              description={option.description}
              selected={option.value === value}
              disabled={disabled}
              onPress={() => {
                hapticSelection()
                onChange(option.value)
              }}
            />
          ))}
          {Array.from({ length: columns - row.length }, (_, blank) => (
            <View key={`blank-${blank}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  )
}
/**
 * 여러 개를 고르는 칩 격자 — 같은 면·같은 간격의 `RecordChoice` 를 체크박스 의미로 쓴다.
 * 신장 정보 페이지의 진단 원인·동반 질환처럼 "해당하는 것 전부" 를 묻는 자리다.
 */
export function RecordMultiChoices<T extends string>({
  options,
  values,
  onToggle,
  disabled = false,
}: {
  options: { value: T; label: string; description?: string }[]
  values: readonly T[]
  onToggle: (value: T) => void
  disabled?: boolean
}) {
  const { width, fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const columns = recordChoiceColumns(
    options.map((option) => option.label),
    width - PAGE_X * 2,
    fontScale,
  )
  const rows = Array.from(
    { length: Math.ceil(options.length / columns) },
    (_, i) => options.slice(i * columns, (i + 1) * columns),
  )
  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((option) => (
            <RecordChoice
              key={option.value}
              label={option.label}
              description={option.description}
              selected={values.includes(option.value)}
              disabled={disabled}
              role="checkbox"
              onPress={() => {
                hapticSelection()
                onToggle(option.value)
              }}
            />
          ))}
          {Array.from({ length: columns - row.length }, (_, blank) => (
            <View key={`blank-${blank}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  )
}
/** Touch feedback stays on the UI thread, independent of form reflow. */
function RecordChoice({
  label,
  description,
  selected,
  disabled,
  onPress,
  role = "radio",
}: {
  label: string
  description?: string
  selected: boolean
  disabled: boolean
  onPress: () => void
  role?: "radio" | "checkbox"
}) {
  const s = useSurface()
  const selectedProgress = useSharedValue(selected ? 1 : 0)
  const scale = useSharedValue(1)
  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, RECORD_TIMING)
  }, [selected, selectedProgress])
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      selectedProgress.value,
      [0, 1],
      [s.surfaceSunken, s.textStrong],
    ),
    backgroundColor: s.surfaceSunken,
  }))
  return (
    <Pressable
      style={styles.touch}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.98, { ...RECORD_TIMING, duration: 90 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, RECORD_SPRING)
      }}
    >
      <Animated.View style={[styles.choice, motion]}>
        <View style={styles.labelRow}>
          <V2Text
            style={styles.label}
            color={
              disabled
                ? s.textMuted
                : selected
                  ? s.textStrong
                  : recordFieldLabel(s)
            }
          >
            {label}
          </V2Text>
        </View>
        {description ? (
          <V2Text style={styles.description} color={recordFieldLabel(s)}>
            {description}
          </V2Text>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}
const styles = StyleSheet.create({
  grid: { gap: S[2] },
  row: { flexDirection: "row", gap: S[2] },
  spacer: { flex: 1 },
  touch: { flex: 1, minWidth: 0 },
  choice: {
    minHeight: FORM.choiceHeight,
    paddingHorizontal: S[2],
    paddingVertical: S[3],
    borderWidth: 1,
    borderRadius: FORM.choiceRadius,
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  label: { ...FORM.option, flexShrink: 1, textAlign: "center" },
  description: { ...FORM.hint, marginTop: S[1] },
})

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, MOTION } from "@/src/theme/surface"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const TIMING = {
  duration: MOTION.duration.fast,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

interface SettingsTextFieldProps extends TextInputProps {
  /** 필드 라벨(13/18). 포커스하면 브랜드색으로 물든다. */
  label: string
  hasError?: boolean
  onClear?: () => void
  /** 필드 오른쪽 끝 부속(남은 시간 등). clear 버튼보다 바깥쪽에 선다. */
  trailing?: ReactNode
}

/**
 * 설정 계열 화면의 단일 입력 — 가입 스텝(`StepTextInput`)과 같은 문법이다.
 *
 * 테두리·밑줄 없이 회색 면 하나로 그리고, 상태는 라벨 색과 커서가 말한다.
 * 오류는 색으로만 알리지 않는다 — 한 번 흔들고 이유는 아래 한 줄로 쓴다.
 * (예전 설정 화면들은 밑줄 + 구 초록(sub6)이라 가입 흐름과 따로 놀았다.)
 */
export function SettingsTextField({
  label,
  hasError,
  onClear,
  trailing,
  value,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: SettingsTextFieldProps) {
  const s = useSurface()
  const { t } = useTranslation("settings")
  const [isFocused, setIsFocused] = useState(false)
  const [secureVisible, setSecureVisible] = useState(false)
  const filled = !!value

  const focus = useSharedValue(isFocused ? 1 : 0)
  const shake = useSharedValue(0)
  const wasError = useRef(false)

  useEffect(() => {
    focus.value = withTiming(isFocused ? 1 : 0, TIMING)
  }, [focus, isFocused])

  useEffect(() => {
    // 오류로 "바뀌는" 순간에만 흔든다. 머무는 동안 계속 떨면 읽히지 않는다.
    if (hasError && !wasError.current) {
      shake.value = withSequence(
        withTiming(-5, { duration: 45, reduceMotion: ReduceMotion.System }),
        withTiming(5, { duration: 55, reduceMotion: ReduceMotion.System }),
        withTiming(-3, { duration: 45, reduceMotion: ReduceMotion.System }),
        withSpring(0, {
          damping: 14,
          stiffness: 260,
          reduceMotion: ReduceMotion.System,
        }),
      )
    }
    wasError.current = !!hasError
  }, [hasError, shake])

  const fieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }))

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focus.value,
      [0, 1],
      [s.textWeak, hasError ? s.danger : s.brand],
    ),
  }))

  return (
    <View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>

      <Animated.View
        style={[styles.field, { backgroundColor: s.surface }, fieldStyle]}
      >
        <TextInput
          {...props}
          value={value}
          secureTextEntry={secureTextEntry && !secureVisible}
          onFocus={(e) => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          selectionColor={s.brand}
          placeholderTextColor={s.placeholder}
          style={[styles.input, { color: s.textStrong }]}
        />

        {secureTextEntry && filled && (
          <Pressable
            onPress={() => setSecureVisible((visible) => !visible)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              secureVisible
                ? t("shared.hidePassword")
                : t("shared.showPassword")
            }
          >
            <Ionicons
              name={secureVisible ? "eye-off-outline" : "eye-outline"}
              size={19}
              color={s.textWeak}
            />
          </Pressable>
        )}

        {onClear && filled && (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("shared.clearField", { label })}
          >
            <Ionicons name="close-circle" size={19} color={s.textWeak} />
          </Pressable>
        )}

        {trailing}
      </Animated.View>
    </View>
  )
}

/**
 * 필드 아래 한 줄. 오류는 danger, 통과는 브랜드, 안내는 회색 — 색이 곧 상태다.
 */
export function FieldHelp({
  text,
  tone = "muted",
}: {
  text: string
  tone?: "muted" | "valid" | "error"
}) {
  const s = useSurface()
  const color =
    tone === "error" ? s.danger : tone === "valid" ? s.brand : s.textMuted
  return (
    <Text style={[styles.help, { color }]} lineBreakStrategyIOS="hangul-word">
      {text}
    </Text>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
    marginBottom: 8,
  },
  field: {
    height: LAYOUT.field.height,
    borderRadius: LAYOUT.field.radius,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    letterSpacing: -0.32,
    padding: 0,
    includeFontPadding: false,
  },
  help: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.26,
    marginTop: 8,
  },
})

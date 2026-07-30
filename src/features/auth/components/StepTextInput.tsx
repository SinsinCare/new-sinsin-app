import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  ZoomIn,
  ZoomOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_MOTION, AUTH_TYPE } from "../data/authSurface"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const TIMING = {
  duration: AUTH_MOTION.duration.fast,
  easing: EASE,
  reduceMotion: ReduceMotion.System,
}

interface StepTextInputProps extends TextInputProps {
  /** 필드 라벨. 시트 사양(13/18) — 포커스 시 프라이머리로 물든다. */
  label: string
  hasError?: boolean
  onClear?: () => void
  /** 필드 오른쪽 끝에 붙는 부속(남은 시간 등). clear 버튼보다 바깥쪽에 선다. */
  trailing?: ReactNode
}

/**
 * 스텝 화면용 단일 입력. 테두리 없이 회색 면 하나로 그린다 — 상태는 라벨 색과
 * 커서가 말한다(default → focus 라벨 프라이머리 → typing clear 20px → filled).
 *
 * 오류는 색으로만 알리지 않는다. 한 번 흔들고, 이유는 아래 한 줄로 쓴다.
 */
export function StepTextInput({
  label,
  hasError,
  onClear,
  trailing,
  value,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: StepTextInputProps) {
  const surface = useAuthSurface()
  const { t } = useTranslation("auth")
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
    // 오류로 "바뀌는" 순간에만 흔든다. 오류 상태로 머무는 동안 계속 떨면 읽히지 않는다.
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
      [surface.textWeak, surface.brand],
    ),
  }))

  return (
    <View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>

      <Animated.View
        style={[styles.field, { backgroundColor: surface.surface }, fieldStyle]}
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
          selectionColor={surface.brand}
          style={[styles.input, { color: surface.textStrong }, props.style]}
          placeholderTextColor={surface.placeholder}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              secureVisible ? t("password.hide") : t("password.show")
            }
            onPress={() => setSecureVisible((v) => !v)}
            hitSlop={12}
          >
            <Ionicons
              name={secureVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={surface.placeholder}
            />
          </Pressable>
        ) : filled && onClear ? (
          <Animated.View entering={ZoomIn.duration(120)} exiting={ZoomOut}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.clearInput")}
              onPress={onClear}
              hitSlop={12}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={surface.placeholder}
              />
            </Pressable>
          </Animated.View>
        ) : null}
        {trailing}
      </Animated.View>
    </View>
  )
}

/** 라벨만 필요한 입력(선택 카드·바텀시트 트리거) 앞에 쓰는 같은 규격의 라벨. */
export function StepFieldLabel({ children }: { children: string }) {
  const surface = useAuthSurface()
  return (
    <Text style={[styles.label, { color: surface.textWeak }]}>{children}</Text>
  )
}

const styles = StyleSheet.create({
  label: {
    ...AUTH_TYPE.label,
    fontWeight: "500",
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    height: AUTH_LAYOUT.fieldHeight,
    borderRadius: AUTH_LAYOUT.radius.field,
    paddingHorizontal: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    ...AUTH_TYPE.field,
    fontWeight: "400",
    padding: 0,
  },
})

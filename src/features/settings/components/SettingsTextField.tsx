import { useEffect, useRef, useState, type ReactNode } from "react"
import { Pressable, StyleSheet, type TextInputProps, View } from "react-native"
import { Text, TextInput } from "@/src/shared/components/AppText"
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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ **이 필드는 우물(`s.surface`)이다 — 그래서 흰 페이지 위에서만 성립한다** (2026-08-22)
 *
 * 테두리가 없으므로 이 필드를 보이게 하는 것은 **면 하나**뿐이다. 그런데 `s.surface` 는
 * 라이트에서 **화면 바닥과 같은 토큰**이다(`theme/surface.ts` 의 `well` — 8개 화면이
 * `isDark ? canvas : surface` 로 그 값을 바닥에 깐다). 즉 이 필드를 **바닥 위에 바로
 * 놓으면 필드가 바닥에 녹는다.**
 *
 * 실제로 그랬다. 이 넷(`NicknameEdit` · `NameEdit` · `PasswordEdit` · `PhoneNumberEdit`)이
 * 페이지 바닥으로 `tokens.color.appBg` 를 깔았는데, 앞선 작업이 그 토큰을 우물로 통일하면서
 * 바닥과 필드가 **같은 값**이 됐다: 라이트 ΔL* **7.25 → 0.00**(#f7f7f7 위 #f4f4f5 이던
 * 시절엔 2.77 로 간신히 갈렸다). `lightContrastAudit` §8 이 커뮤니티 고정층에 대해
 * 미리 적어 둔 함정 — "고정층을 바닥색으로 칠하면 검색 필드가 사라진다" — 이 이미
 * 여기서 터져 있었던 것이다.
 *
 * 고르는 길은 둘이었다:
 *   (a) 필드를 `fill.control` 로 옮긴다 — 그 값은 **흰 면 위** 기준으로 정해진 천장이라
 *       (`tokens/colors.ts` §fill.control) 회색 바닥 위에서는 ΔL* **4.56** 밖에 안 되고,
 *       덤으로 다크 필드가 #3f3f45 → #313135 로 같이 움직인다.
 *   (b) **페이지를 흰 면으로 올린다** — 필드는 한 줄도 안 고치고 ΔL* **7.25** 를 되찾는다.
 *       다크는 `canvas` 가 곧 `appBgDark`(#1f1f21)라 **한 픽셀도 안 움직인다.**
 * **(b) 를 골랐다.** 이 화면들엔 원래 바닥이 없다 — 폼 한 장이 곧 콘텐츠 면이고,
 * `useSettingsColors` 를 쓰는 설정 화면 14개도 이미 라이트 페이지를 흰색으로 둔다.
 * 갈라져 있던 것은 이 넷뿐이었다.
 *
 * ⚠ **새 화면에서 이 컴포넌트를 회색 바닥 위에 놓지 마라.** 그 화면은 흰 페이지이거나,
 * 최소한 이 필드가 앉는 상자가 흰 면이어야 한다. 규칙은 일반 가드가 지킨다
 * (`tests/lightContrastAudit.test.ts` §9 — "바닥과 그 위의 면은 같은 값일 수 없다").
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
    <Text
      style={[styles.help, { color }]}
      lineBreakStrategyIOS="hangul-word"
      textBreakStrategy="balanced"
    >
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

import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  type TextInputProps,
} from "react-native"
import { useState } from "react"

import { useV2Theme, V2Text, V2VStack } from "@/src/design-system-v2"

const ANDROID_MAX_FONT_SCALE = 1.3
const INPUT_BASE_HEIGHT = 48
const INPUT_LINE_HEIGHT = 22
const INPUT_VERTICAL_PADDING = 14

/**
 * 한 줄 입력 필드.
 *
 * ■ tamagui `styled(Input)` + `Label` 이었다 (2026-08-19 이행)
 *
 *   `Input`/`Label`/`styled` 는 tamagui 를 붙들던 구조적 의존점이다. RN `TextInput`
 *   으로 내려도 잃는 것이 없다 — 이 필드가 tamagui 에서 실제로 받던 것은
 *   배경·테두리·포커스 색과 높이 계산뿐이고, 그건 전부 여기 그대로 있다.
 *
 *   `Label` 은 접근성상 `TextInput` 과 묶이지 않는 단순 텍스트였으므로
 *   `V2Text` 로 대체하고 `accessibilityLabel` 로 연결을 명시했다 — 오히려 나아진다.
 *
 * ■ 안드로이드 높이 계산은 손대지 않았다
 *
 *   글꼴 배율이 커지면 48 고정 높이에서 글자가 잘린다. 그 계산(폰트 배율 상한 1.3,
 *   줄높이+패딩으로 최소 높이 산출)은 tamagui 와 무관한 로직이라 그대로 옮겼다.
 */
interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string
  error?: string
  helper?: string
  style?: TextInputProps["style"]
}

export function TextField({
  label,
  error,
  helper,
  onFocus,
  onBlur,
  style,
  ...props
}: TextFieldProps) {
  const { colors } = useV2Theme()
  const [isFocused, setIsFocused] = useState(false)
  const { fontScale } = useWindowDimensions()
  const androidFontScale = Math.min(fontScale, ANDROID_MAX_FONT_SCALE)
  const androidInputHeight = Math.max(
    INPUT_BASE_HEIGHT,
    Math.ceil(
      INPUT_LINE_HEIGHT * androidFontScale + INPUT_VERTICAL_PADDING * 2,
    ),
  )
  const height =
    Platform.OS === "ios" && fontScale <= 1
      ? INPUT_BASE_HEIGHT
      : androidInputHeight

  const borderColor = error
    ? colors.status.negative
    : isFocused
      ? colors.primary.primary
      : colors.line.normal

  return (
    <V2VStack gap={6}>
      {label && (
        <V2Text
          color={
            error
              ? colors.status.negative
              : isFocused
                ? colors.primary.primary
                : colors.label.strong
          }
          style={styles.label}
        >
          {label}
        </V2Text>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.label.assistive}
        {...props}
        maxFontSizeMultiplier={ANDROID_MAX_FONT_SCALE}
        textAlignVertical={Platform.OS === "android" ? "center" : undefined}
        style={[
          styles.input,
          {
            height,
            minHeight: height,
            backgroundColor: colors.background.default,
            borderColor,
            // 포커스 때 선이 굵어진다(tamagui focusStyle 을 옮긴 것).
            borderWidth: isFocused && !error ? 2 : 1,
            color: colors.label.strong,
            paddingVertical: Platform.OS === "android" ? 0 : undefined,
          },
          style,
        ]}
        onFocus={(event) => {
          setIsFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          onBlur?.(event)
        }}
      />
      {(error || helper) && (
        <V2Text
          color={error ? colors.status.negative : colors.label.neutral}
          style={styles.helper}
        >
          {error || helper}
        </V2Text>
      )}
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14 },
  input: {
    // tamagui `borderRadius="$3"` = radius 스케일 6.
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    // 단일행: lineHeight 를 주면 iOS 가 글리프를 라인박스 바닥으로 민다(surface.ts singleLineInputText).
    // 높이는 위 `height` 가 INPUT_LINE_HEIGHT 로 계산한다.
    includeFontPadding: false,
  },
  helper: { fontSize: 12 },
})

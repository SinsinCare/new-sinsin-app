import { useState } from "react"
import {
  Platform,
  StyleSheet,
  TextInput,
  type ColorValue,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  useWindowDimensions,
} from "react-native"
import { Label, Text, YStack } from "tamagui"

import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"

const ANDROID_MAX_FONT_SCALE = 1.3
const TEXT_AREA_BASE_HEIGHT = 112
const TEXT_AREA_LINE_HEIGHT = 22
const TEXT_AREA_VERTICAL_PADDING = 14
const TEXT_AREA_MIN_LINES = 4

interface TextAreaFieldProps extends Omit<
  TextInputProps,
  "multiline" | "style"
> {
  label?: string
  error?: string
  helper?: string
  minLines?: number
  inputStyle?: StyleProp<TextStyle>
  borderColor?: ColorValue
  backgroundColor?: ColorValue
  color?: ColorValue
  borderRadius?: number
}

export function TextAreaField({
  label,
  error,
  helper,
  minLines = TEXT_AREA_MIN_LINES,
  onFocus,
  onBlur,
  inputStyle,
  borderColor,
  backgroundColor,
  color,
  borderRadius = 10,
  placeholderTextColor,
  ...props
}: TextAreaFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const isDarkMode = useAppColorScheme() === "dark"
  const { fontScale } = useWindowDimensions()
  const androidFontScale = Math.min(fontScale, ANDROID_MAX_FONT_SCALE)
  const inputHeight =
    Platform.OS === "android"
      ? Math.max(
          TEXT_AREA_BASE_HEIGHT,
          Math.ceil(
            TEXT_AREA_LINE_HEIGHT * androidFontScale * minLines +
              TEXT_AREA_VERTICAL_PADDING * 2,
          ),
        )
      : TEXT_AREA_BASE_HEIGHT

  const resolvedBorderColor =
    borderColor ??
    (isDarkMode ? tokens.color.borderDark.val : tokens.color.borderLight.val)
  const resolvedBackgroundColor =
    backgroundColor ??
    (isDarkMode ? tokens.color.inputBgDark.val : tokens.color.pureWhite.val)
  const resolvedColor =
    color ??
    (isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val)

  return (
    <YStack gap="$1.5">
      {label && (
        <Label
          size="$4"
          fontSize={14}
          color={error ? "$danger" : isFocused ? "$primary" : "$color"}
        >
          {label}
        </Label>
      )}
      <TextInput
        {...props}
        multiline
        style={[
          styles.input,
          {
            height: inputHeight,
            borderRadius,
            borderColor: error ? tokens.color.error.val : resolvedBorderColor,
            backgroundColor: resolvedBackgroundColor,
            color: resolvedColor,
          },
          inputStyle,
        ]}
        placeholderTextColor={placeholderTextColor ?? tokens.color.grey5.val}
        maxFontSizeMultiplier={
          Platform.OS === "android" ? ANDROID_MAX_FONT_SCALE : undefined
        }
        textAlignVertical="top"
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
        <Text fontSize={12} color={error ? "$danger" : "$colorSubtle"}>
          {error || helper}
        </Text>
      )}
    </YStack>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    fontSize: 16,
    lineHeight: TEXT_AREA_LINE_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: TEXT_AREA_VERTICAL_PADDING,
  },
})

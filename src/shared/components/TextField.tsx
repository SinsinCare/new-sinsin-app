import { Platform, useWindowDimensions } from "react-native"
import { Input, Label, YStack, Text, styled, InputProps } from "tamagui"
import { useState } from "react"

const ANDROID_MAX_FONT_SCALE = 1.3
const INPUT_BASE_HEIGHT = 48
const INPUT_LINE_HEIGHT = 22
const INPUT_VERTICAL_PADDING = 14

const StyledInput = styled(Input, {
  name: "SinsinInput",
  backgroundColor: "$cardBackground",
  borderWidth: 1,
  borderColor: "$borderColor",
  borderRadius: "$3",
  height: 48,
  paddingHorizontal: "$3",
  fontSize: 16,

  focusStyle: {
    borderColor: "$primary",
    borderWidth: 2,
  },

  variants: {
    error: {
      true: {
        borderColor: "$danger",
      },
    },
  } as const,
})

interface TextFieldProps extends Omit<InputProps, "size"> {
  label?: string
  error?: string
  helper?: string
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
  const [isFocused, setIsFocused] = useState(false)
  const { fontScale } = useWindowDimensions()
  const androidFontScale = Math.min(fontScale, ANDROID_MAX_FONT_SCALE)
  const androidInputHeight = Math.max(
    INPUT_BASE_HEIGHT,
    Math.ceil(
      INPUT_LINE_HEIGHT * androidFontScale + INPUT_VERTICAL_PADDING * 2,
    ),
  )

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
      <StyledInput
        size="$4"
        {...props}
        height={
          Platform.OS === "android" ? androidInputHeight : INPUT_BASE_HEIGHT
        }
        minHeight={
          Platform.OS === "android" ? androidInputHeight : INPUT_BASE_HEIGHT
        }
        paddingVertical={Platform.OS === "android" ? 0 : undefined}
        textAlignVertical={Platform.OS === "android" ? "center" : undefined}
        maxFontSizeMultiplier={
          Platform.OS === "android" ? ANDROID_MAX_FONT_SCALE : undefined
        }
        style={[
          {
            lineHeight: INPUT_LINE_HEIGHT,
          },
          style,
        ]}
        error={!!error}
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

import { useCallback } from "react"
import {
  TextInput,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
  StyleSheet,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"

const TEXT_COLOR = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
}
const PLACEHOLDER_COLOR = {
  light: tokens.color.textLightSub.val,
  dark: tokens.color.textLightMuted.val,
}

interface TextBlockProps {
  content: string
  onChange: (text: string) => void
  onSelectionChange?: (position: number) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function TextBlock({
  content,
  onChange,
  onSelectionChange,
  onFocus,
  onBlur,
  placeholder,
  autoFocus,
}: TextBlockProps) {
  const scheme = useAppColorScheme()

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      onSelectionChange?.(e.nativeEvent.selection.start)
    },
    [onSelectionChange],
  )

  return (
    <TextInput
      value={content}
      onChangeText={onChange}
      onSelectionChange={handleSelectionChange}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={PLACEHOLDER_COLOR[scheme]}
      multiline
      scrollEnabled={false}
      autoFocus={autoFocus}
      style={[styles.input, { color: TEXT_COLOR[scheme] }]}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    textAlignVertical: "top",
  },
})

import { useCallback } from "react"
import {
  TextInput,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
  StyleSheet,
} from "react-native"
import { useSurface } from "@/src/hooks/useSurface"

/*
  색은 `useSurface()` 에서 온다. 예전에는 `{ light, dark }` 두 벌을 손으로 들고 있었고
  **다크 칸에 라이트 토큰**(`textLightSub`·`textLightMuted`)이 들어 있었다 — 다크에서
  본문과 플레이스홀더가 사실상 같은 밝기가 되어, 빈 칸이 이미 적힌 칸으로 읽혔다.
*/

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
  const surface = useSurface()

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
      placeholderTextColor={surface.placeholder}
      multiline
      scrollEnabled={false}
      autoFocus={autoFocus}
      style={[styles.input, { color: surface.textStrong }]}
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

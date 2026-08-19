import { Pressable, StyleSheet, type ViewStyle } from "react-native"

import {
  useV2Theme,
  V2DotLoader,
  V2HStack,
  V2Text,
} from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"

/**
 * 앱 공용 버튼.
 *
 * ■ tamagui `styled(Button)` 이었다 (2026-08-19 이행)
 *
 *   `styled` 는 이 레포에서 tamagui 를 붙들던 구조적 의존점이다. variant 표를
 *   그대로 옮기고 `Pressable` + `StyleSheet` 로 다시 썼다.
 *
 * ■ 옮기면서 고친 것 — outline/ghost 의 글자가 안 보였다
 *
 *   variant 표는 `outline`/`ghost` 의 글자를 `$primary` 로 정해 두었는데, 정작
 *   내부 `<Text>` 가 `color="white"` **하드코딩**이었다. 즉 배경이 투명한 두 variant 는
 *   **흰 바탕에 흰 글자**가 된다. 실제로 `ErrorMessage` 의 재시도 버튼이 outline 이다.
 *   variant 가 글자색까지 들고 있도록 고쳤다.
 */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "small" | "medium" | "large"

interface ButtonProps {
  children: React.ReactNode
  variant?: Variant
  buttonSize?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  flex?: number
}

export function Button({
  children,
  variant = "primary",
  buttonSize = "medium",
  fullWidth,
  loading,
  disabled,
  onPress,
  flex,
}: ButtonProps) {
  const { colors } = useV2Theme()
  const isDisabled = disabled || loading

  /*
    themes.ts 대응:
      $secondary → status.positive (이 앱에서 주황은 제한 신호라 안전을 겸하지 않는다)
      $primary   → primary.primary
      $danger    → status.negative
  */
  const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> =
    {
      primary: { bg: tokens.color.sub6.val, fg: colors.static.white },
      secondary: { bg: colors.status.positive, fg: colors.static.white },
      outline: {
        bg: "transparent",
        fg: colors.primary.primary,
        border: colors.primary.primary,
      },
      ghost: { bg: "transparent", fg: colors.primary.primary },
      danger: { bg: colors.status.negative, fg: colors.static.white },
    }

  const tone = PALETTE[variant]
  const handlePress = () => {
    if (isDisabled) return
    onPress?.()
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }): ViewStyle => ({
        ...styles.base,
        ...SIZE[buttonSize],
        backgroundColor: tone.bg,
        ...(tone.border ? { borderWidth: 1, borderColor: tone.border } : null),
        ...(fullWidth ? { width: "100%" } : null),
        ...(flex !== undefined ? { flex } : null),
        // tamagui `pressStyle` 을 옮긴 것.
        opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        transform: pressed ? [{ scale: 0.98 }] : undefined,
      })}
    >
      <V2HStack gap={8} align="center" justify="center" style={styles.row}>
        {loading && <V2DotLoader size="s" color={tone.fg} />}
        <V2Text color={tone.fg} style={styles.label}>
          {children}
        </V2Text>
      </V2HStack>
    </Pressable>
  )
}

/** tamagui `variants.buttonSize` 를 그대로 옮긴 값. */
const SIZE: Record<ButtonSize, ViewStyle> = {
  small: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8 },
  medium: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12 },
  large: { minHeight: 56, paddingHorizontal: 20, paddingVertical: 12 },
}

const styles = StyleSheet.create({
  // tamagui `borderRadius="$3"` = radius 스케일 6.
  base: { borderRadius: 6, alignItems: "center", justifyContent: "center" },
  row: { flexShrink: 1, maxWidth: "100%" },
  label: { textAlign: "center", flexShrink: 1, lineHeight: 20 },
})

// Design System v2 — Card
// 범용 정보 surface 컨테이너. Figma에 1:1 대응 원본이 없어 토큰 조합으로 구성한 범용 카드.
//
// variant → 표면 표현 방식:
//  - flat      : 배경만 (기본)
//  - outlined  : 1px 테두리(line.normal)
//  - elevated  : 그림자(elevation[1]) + 배경 background.default (떠 있는 표면)
// tone → 표면 배경 톤 (default / lower). elevated는 떠 있는 표면이라 항상 background.default.
// onPress가 있으면 Pressable로 렌더 + 눌림 opacity 피드백.

import { type ReactNode } from "react"
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native"
import { borderWidth, elevation, radius, spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2CardVariant = "flat" | "outlined" | "elevated"
export type V2CardTone = "default" | "lower"

export type V2CardProps = {
  /** 카드 내용 */
  children?: ReactNode
  /** 표면 표현: 평면 / 테두리 / 그림자 (기본 'flat') */
  variant?: V2CardVariant
  /** 표면 배경 톤: default / lower (기본 'default'). elevated에서는 무시 */
  tone?: V2CardTone
  /** 내부 패딩(spacing[16]) 적용 여부 (기본 true) */
  padded?: boolean
  /** 지정 시 Pressable로 렌더 + 눌림 피드백 */
  onPress?: () => void
  style?: ViewStyle
}

export function V2Card({
  children,
  variant = "flat",
  tone = "default",
  padded = true,
  onPress,
  style,
}: V2CardProps) {
  const { colors } = useV2Theme()

  // elevated는 떠 있는 표면 → tone과 무관하게 background.default 사용
  const backgroundColor =
    variant !== "elevated" && tone === "lower"
      ? colors.background.lower
      : colors.background.default

  const surfaceStyle: ViewStyle = {
    backgroundColor,
    ...(padded && { padding: spacing[16] }),
    ...(variant === "outlined" && {
      borderWidth: borderWidth.thin,
      borderColor: colors.line.normal,
    }),
    // elevation[1] = iOS shadow* + Android elevation 토큰 스프레드
    ...(variant === "elevated" && elevation[1]),
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          surfaceStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    )
  }

  return <View style={[styles.base, surfaceStyle, style]}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius["2xl"], // 16
    overflow: "hidden",
  },
  // 눌림 피드백 — 정확한 pressed 토큰 미추출, opacity 기반 (V2Button과 동일 접근)
  pressed: { opacity: 0.9 },
})

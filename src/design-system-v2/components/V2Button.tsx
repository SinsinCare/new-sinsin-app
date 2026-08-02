// Design System v2 — Button
// Spec: project/design-system-v2/design-system-base/components/Button.md (Figma node 30:952)
//
// Figma의 5축(Size/Color/Variant/Disabled/States)을 RN 관점으로 매핑:
//  - size / color / variant  → props (선언적)
//  - Disabled                → `disabled` boolean prop
//  - States.Loading          → `loading` boolean prop
//  - States.Pressed          → 런타임 상호작용(Pressable의 pressed) — prop 아님
//
// 패턴: (color,variant)→{bg,fg} 토큰 룩업 + size→치수/타이포 룩업.
//  시맨틱 색은 useV2Theme(다크 자동), 원시/opacity 색은 primitives에서.

import { type ReactNode } from "react"
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native"
import {
  controlHeight,
  primitives,
  radius,
  spacing,
  typography,
  type SemanticColors,
} from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2DotLoader } from "./V2DotLoader"

export type V2ButtonSize = "s" | "m" | "l" | "xl"
// 색상 이름은 Figma와 1:1 (축약하지 않음 — 신규 작업자가 디자인↔코드 바로 대조 가능)
export type V2ButtonColor = "brand" | "neutral" | "danger" | "primaryInverse"
export type V2ButtonVariant = "fill" | "weak"

export type V2ButtonProps = Omit<PressableProps, "children" | "style"> & {
  /** 버튼 라벨 (문자열 권장) */
  children?: ReactNode
  size?: V2ButtonSize
  color?: V2ButtonColor
  variant?: V2ButtonVariant
  /** 로딩 표시(점 로더) + 상호작용 차단 */
  loading?: boolean
  /** 부모 폭으로 늘림 */
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  style?: ViewStyle
}

/** size → 치수 + 타이포 (Button.md Size 스펙) */
const SIZE = {
  s: {
    minHeight: controlHeight.sm,
    paddingHorizontal: spacing[10],
    borderRadius: radius.sm,
    text: typography.label.xSmall,
  },
  m: {
    minHeight: controlHeight.md,
    paddingHorizontal: spacing[16],
    borderRadius: radius.md,
    text: typography.label.small,
  },
  l: {
    minHeight: controlHeight.lg,
    paddingHorizontal: spacing[16],
    borderRadius: radius.xl,
    text: typography.label.medium,
  },
  xl: {
    minHeight: controlHeight.xl,
    paddingHorizontal: spacing[28],
    borderRadius: radius["2xl"],
    text: typography.label.medium,
  },
} as const

/** (color, variant) → { bg, fg } 토큰. States=Default 기준 (Button.md 색상 매트릭스) */
function resolveColors(
  color: V2ButtonColor,
  variant: V2ButtonVariant,
  colors: SemanticColors,
): { bg: string; fg: string } {
  const map = {
    brand: {
      fill: { bg: colors.primary.primary, fg: colors.static.white },
      weak: { bg: colors.primary.primaryWeak, fg: colors.primary.primary },
    },
    neutral: {
      // Neutral/Fill 배경은 원시 grayscale 700 (mode 무관)
      fill: { bg: primitives.grayscale[700], fg: colors.static.white },
      weak: { bg: colors.fill.normal, fg: colors.label.neutral },
    },
    danger: {
      fill: { bg: colors.status.negative, fg: colors.static.white },
      weak: {
        bg: colors.accentForeground.redWeak,
        fg: colors.accentForeground.red,
      },
    },
    primaryInverse: {
      // 컬러/이미지 배경 위에서 쓰는 반전 버튼
      fill: { bg: colors.static.white, fg: colors.primary.primary },
      weak: { bg: primitives.opacityWhite[200], fg: colors.static.white },
    },
  } as const
  return map[color][variant]
}

export function V2Button({
  children,
  size = "m",
  color = "brand",
  variant = "fill",
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  ...rest
}: V2ButtonProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const resolved = resolveColors(color, variant, colors)
  const isDisabled = disabled || loading
  // 비활성은 브랜드색을 흐리게 깔지 않는다 — 옅은 주황은 "곧 눌린다"로 읽혀
  // 계속 누르게 만든다. 아예 중립 면으로 빠지고 글자는 보조 톤으로 낮춘다.
  const bg = isDisabled ? colors.fill.normal : resolved.bg
  const fg = isDisabled ? colors.label.disable : resolved.fg

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: s.minHeight,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.borderRadius,
          backgroundColor: bg,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        // 라벨 자리에 그대로 들어가는 점 세 개 — 링과 달리 버튼 높이를 흔들지 않는다.
        <V2DotLoader color={fg} size={size === "s" ? "s" : "m"} />
      ) : (
        <>
          {leftIcon}
          <Text style={[s.text, { color: fg }]} numberOfLines={1}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[10],
    paddingVertical: spacing[2],
  },
  fullWidth: { alignSelf: "stretch" },
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(legacy와 동일 접근).
  pressed: { opacity: 0.85 },
})

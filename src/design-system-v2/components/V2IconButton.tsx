// Design System v2 — Icon Button
// Spec: project/design-system-v2/design-system-base/components/Icon-Button.md (Figma node 184:252)
//
// 텍스트 없이 아이콘 1개만 담는 정사각 버튼(툴바·헤더·인풋 보조 액션).
// Figma에는 2축(Variant/Size)만 존재 — Color/Disabled/States 축 없음(뉴트럴 1종 고정).
//  - variant / size → props (선언적)
//  - Disabled       → `disabled` boolean prop (Figma엔 없지만 구현상 필요 → opacity)
//  - Pressed        → 런타임 상호작용(Pressable의 pressed) — prop 아님
//
// 패턴: size→치수 룩업 + variant→배경/테두리 룩업(아이콘색은 전 variant 공통 label.neutral).
//  시맨틱 색은 useV2Theme(다크 자동).

import { type ReactNode } from "react"
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  type ViewStyle,
} from "react-native"
import {
  borderWidth,
  controlHeight,
  iconSize,
  radius,
  touchTarget,
  type SemanticColors,
} from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import type { V2IconName } from "../icons"
import { V2Icon } from "./V2Icon"

export type V2IconButtonSize = "s" | "m" | "l"
// 변형 이름은 Figma와 1:1 (축약하지 않음)
export type V2IconButtonVariant = "clear" | "border" | "fill"

export type V2IconButtonProps = Omit<PressableProps, "children" | "style"> & {
  /** 레지스트리 아이콘 이름 — V2Icon으로 렌더 (icon보다 우선) */
  name?: V2IconName
  /** 커스텀 아이콘 노드 (name 미지정 시 사용) */
  icon?: ReactNode
  size?: V2IconButtonSize
  variant?: V2IconButtonVariant
  disabled?: boolean
  style?: ViewStyle
}

/**
 * size → 정사각 한 변 / 아이콘 / radius (Icon-Button.md Size 스펙, 보정값)
 * ⚠️ 보정: Figma 변형 이름의 S↔L이 실제 픽셀과 반대로 붙어 있어 실제 크기 기준으로 정정.
 *   실제 픽셀: s=32 · m=38 · l=48, 아이콘 16/20/24, radius 11/13/16.
 *   토큰 매핑: controlHeight(sm/md/lg) · iconSize(xs/sm/md) · radius(md=11 / lg=13 / 2xl=16).
 */
const SIZE = {
  s: { box: controlHeight.sm, icon: iconSize.xs, borderRadius: radius.md },
  m: { box: controlHeight.md, icon: iconSize.sm, borderRadius: radius.lg },
  l: { box: controlHeight.lg, icon: iconSize.md, borderRadius: radius["2xl"] },
} as const

/** variant → { 배경, 테두리 }. 아이콘색은 전 variant 공통이라 여기서 다루지 않음 (Icon-Button.md 색상 매트릭스) */
function resolveVariant(
  variant: V2IconButtonVariant,
  colors: SemanticColors,
): ViewStyle {
  switch (variant) {
    case "clear":
      return { backgroundColor: "transparent" }
    case "border":
      return {
        backgroundColor: "transparent",
        borderWidth: borderWidth.thin,
        borderColor: colors.line.neutral,
      }
    case "fill":
      return { backgroundColor: colors.fill.normal }
  }
}

export function V2IconButton({
  name,
  icon,
  size = "m",
  variant = "clear",
  disabled = false,
  style,
  ...rest
}: V2IconButtonProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const variantStyle = resolveVariant(variant, colors)
  // 작은 사이즈는 hit-slop으로 최소 터치타겟(44) 확보 — l(48)은 0
  const hitSlop = Math.max(0, (touchTarget.min - s.box) / 2)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.base,
        {
          width: s.box,
          height: s.box,
          borderRadius: s.borderRadius,
        },
        variantStyle,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {name ? (
        <V2Icon name={name} size={s.icon} color={colors.label.neutral} />
      ) : (
        icon
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(V2Button과 동일 접근).
  pressed: { opacity: 0.85 },
  // Disabled: Figma 스펙 밖. 흐리게(투명도↓) → opacity 기반(V2Button과 동일 접근).
  disabled: { opacity: 0.4 },
})

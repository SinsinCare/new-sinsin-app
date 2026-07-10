// Design System v2 — Chip
// 인터랙티브 필터/토글 칩(pill). Badge(비인터랙티브 태그)와 별개.
//
// 상태 모델:
//  - selected  → 선택/미선택 색 전환(prop, 선언적)
//  - Pressed   → 런타임 상호작용(Pressable의 pressed) — prop 아님
//  - disabled  → boolean prop
//
// 패턴: size→치수/타이포 룩업 + selected→{bg,fg} 토큰 룩업.
//  시맨틱 색은 useV2Theme(다크 자동).

import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native"
import { iconSize, radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import type { V2IconName } from "../icons"

export type V2ChipSize = "s" | "m"

export type V2ChipProps = {
  /** 칩 라벨 */
  label: string
  /** 선택 상태(색 전환). 기본 false */
  selected?: boolean
  onPress?: () => void
  size?: V2ChipSize
  /** 라벨 좌측 아이콘 */
  leadingIcon?: V2IconName
  /** 있으면 우측 × 표시 — 눌러 제거(칩 onPress와 분리) */
  onRemove?: () => void
  disabled?: boolean
  style?: ViewStyle
}

/** size → 치수 + 타이포 (chip 스펙) */
const SIZE = {
  s: {
    height: 32,
    paddingHorizontal: spacing[12],
    text: typography.label.xSmall, // 13
  },
  m: {
    height: 38,
    paddingHorizontal: spacing[16],
    text: typography.label.small, // 15
  },
} as const

export function V2Chip({
  label,
  selected = false,
  onPress,
  size = "m",
  leadingIcon,
  onRemove,
  disabled = false,
  style,
}: V2ChipProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]

  // 선택/미선택 → 배경·전경(텍스트·아이콘·×) 색
  const bg = selected ? colors.primary.primary : colors.fill.normal
  const fg = selected ? colors.static.white : colors.label.neutral

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: bg,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadingIcon && (
        <V2Icon name={leadingIcon} size={iconSize.sm} color={fg} />
      )}
      <Text style={[s.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove && (
        // × 는 칩 본체와 별개 터치 타겟 — onPress로 전파되지 않음
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="제거"
          disabled={disabled}
          hitSlop={spacing[6]}
          onPress={onRemove}
        >
          <V2Icon name="close" size={iconSize.sm} color={fg} />
        </Pressable>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    borderRadius: radius.full, // pill
  },
  // Pressed: 눌림 피드백(정확한 pressed 토큰 미추출 → opacity 기반, Button과 동일 접근).
  pressed: { opacity: 0.85 },
  // Disabled: 흐리게.
  disabled: { opacity: 0.4 },
})

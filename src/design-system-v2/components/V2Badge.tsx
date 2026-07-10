// Design System v2 — Badge
// Spec: project/design-system-v2/design-system-base/components/Badge.md (Figma node 93:12547)
//
// Figma의 3축(Size/Color/Variant)을 RN props로 매핑. 배지는 비상호작용 정보 요소라
// Pressed/Loading/Disabled 상태 축이 없음 → Pressable이 아니라 View로 구현.
//
// 패턴: (color,variant)→{bg,fg} 토큰 룩업 + size→치수/타이포 룩업 (V2Button과 동일).
//  고정 높이·min-width 없음 — 좌우/상하 패딩으로만 크기 결정, 폭은 내용에 맞춰 hug.
//
// ⚠️ 색상 이름 보정 (Badge.md 참고 메모): Figma의 color 이름이 실제 색과 어긋나 있음.
//  아래 `color` prop 값은 **Figma 원본 이름이 아니라 실제 색 기준의 시맨틱 이름**으로 정의함.
//    Figma "Blue"  → 실제 브랜드 오렌지(#fe7139) → 여기선  `brand`
//    Figma "Grey"  → 실제 회색                  → 여기선  `neutral`
//    Figma "Yellow"→ 실제 노랑                  → 여기선  `yellow`
//    Figma "Red"   → 실제 빨강                  → 여기선  `red`
//    Figma "Green" → 실제 초록                  → 여기선  `green`
//    Figma "Teal"  → 실제 파랑(#19a4d2)         → 여기선  `blue`

import { type ReactNode } from "react"
import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { radius, spacing, typography, type SemanticColors } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2BadgeSize = "xs" | "s" | "m" | "l"
// 실제 색 기준 시맨틱 이름 (Figma 반전 이름 보정 — 파일 상단 매핑 주석 참고)
export type V2BadgeColor =
  | "brand"
  | "neutral"
  | "yellow"
  | "red"
  | "green"
  | "blue"
export type V2BadgeVariant = "fill" | "weak"

export type V2BadgeProps = {
  /** 배지 라벨 (문자열 권장) */
  children?: ReactNode
  size?: V2BadgeSize
  color?: V2BadgeColor
  variant?: V2BadgeVariant
  style?: ViewStyle
}

/**
 * size → 치수 + 타이포 (Badge.md Size 스펙). 색상과 무관 — 색은 color/variant만 좌우함.
 * 정규화(보정):
 *  - px: 스펙 7/7/7/8 → spacing 토큰엔 7 없어 모두 spacing[8]로 스냅.
 *  - py: 스펙 3/3/3/4 → 3은 spacing[2], 4는 spacing[4]로 스냅(L의 세로 여백 우위 유지).
 *  - radius: 스펙 9/11/12/13 → radius 토큰 사다리로 스냅(sm=8은 9, md=10은 11, lg=12는 12·13 포함).
 *  - font: 스펙은 10~14px Bold/SemiBold이나 v2 타이포엔 ≤14px Bold 토큰이 없어
 *          크기 일치 + 가능한 최대 강조(SemiBold/Medium) 토큰으로 근사.
 */
const SIZE = {
  xs: {
    paddingHorizontal: spacing[8], // 스펙 7 → 8
    paddingVertical: spacing[2], // 스펙 3 → 2
    borderRadius: radius.sm, // 스펙 9 → 8
    text: typography.caption.xSmall, // 10 SemiBold (스펙 10 SemiBold 정확 일치)
  },
  s: {
    paddingHorizontal: spacing[8], // 스펙 7 → 8
    paddingVertical: spacing[2], // 스펙 3 → 2
    borderRadius: radius.md, // 스펙 11 → 10
    text: typography.caption.small, // 11 Medium (스펙 12 근접)
  },
  m: {
    paddingHorizontal: spacing[8], // 스펙 7 → 8
    paddingVertical: spacing[2], // 스펙 3 → 2
    borderRadius: radius.lg, // 스펙 12
    text: typography.label.xSmall, // 13 SemiBold (스펙 13, Bold→SemiBold 근사)
  },
  l: {
    paddingHorizontal: spacing[8], // 스펙 8
    paddingVertical: spacing[4], // 스펙 4
    borderRadius: radius.lg, // 스펙 13 → 12
    text: typography.caption.medium, // 14 Medium (스펙 14, Bold→Medium 근사)
  },
} as const

/**
 * (color, variant) → { bg, fg } 시맨틱 토큰. 사이즈와 무관 (Badge.md 색상 매트릭스).
 * 키는 실제 색 기준 시맨틱 이름(파일 상단 Figma 반전 이름 매핑 참고).
 */
function resolveColors(
  color: V2BadgeColor,
  variant: V2BadgeVariant,
  colors: SemanticColors,
): { bg: string; fg: string } {
  const map = {
    // Figma "Blue" = 브랜드 오렌지
    brand: {
      fill: { bg: colors.primary.primary, fg: colors.static.white },
      weak: { bg: colors.primary.primaryWeak, fg: colors.primary.primary },
    },
    // Figma "Grey"
    neutral: {
      fill: { bg: colors.label.neutral, fg: colors.static.white },
      weak: { bg: colors.label.disable, fg: colors.label.neutral },
    },
    // Figma "Yellow": Fill 배경이 밝아 글자를 어두운 회색으로 대비 확보
    yellow: {
      fill: { bg: colors.accentForeground.yellow, fg: colors.label.neutral },
      // Weak 글자 = orange(다크 앰버) — 노랑은 밝아 읽히지 않으므로
      weak: {
        bg: colors.accentForeground.yellowWeak,
        fg: colors.accentForeground.orange,
      },
    },
    // Figma "Red": Weak 글자 = status/negative(더 진함) — 대비 확보
    red: {
      fill: { bg: colors.accentForeground.red, fg: colors.static.white },
      weak: {
        bg: colors.accentForeground.redWeak,
        fg: colors.status.negative,
      },
    },
    // Figma "Green"
    green: {
      fill: { bg: colors.accentForeground.green, fg: colors.static.white },
      weak: {
        bg: colors.accentForeground.greenWeak,
        fg: colors.accentForeground.green,
      },
    },
    // Figma "Teal" = 실제 파랑
    blue: {
      fill: { bg: colors.accentForeground.blue, fg: colors.static.white },
      weak: {
        bg: colors.accentForeground.blueWeak,
        fg: colors.accentForeground.blue,
      },
    },
  } as const
  return map[color][variant]
}

export function V2Badge({
  children,
  size = "l",
  color = "brand",
  variant = "fill",
  style,
}: V2BadgeProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const { bg, fg } = resolveColors(color, variant, colors)

  return (
    <View
      style={[
        styles.base,
        {
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
          borderRadius: s.borderRadius,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Text style={[s.text, { color: fg }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    // 폭은 내용에 맞춰 hug — 부모 폭으로 늘어나지 않도록 flex-start
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
})

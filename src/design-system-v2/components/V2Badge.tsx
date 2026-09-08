import { FONT_SCALE } from "../tokens/fontScaling"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
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

//
// ─────────────────────────────────────────────────────────────────────────────
// ■ `shape="pill"` 의 실제 높이 (커뮤니티 리디자인 §4-G2)
//
// 시안의 마이크로 배지는 **21** 이고, 스펙은 그 값을 `xs` + 세로 여백 4 로 적었다.
// RN 에서 그 조합의 실제 높이는 **23** 이다 — `caption.xSmall` 의 lineHeight 가 15 라
// 4 + 15 + 4 = 23. 21 을 만들려면 여백이 3(토큰에 없다)이거나 라인박스가 13 이어야 한다.
// 여기서는 **스펙이 적은 값(4)을 그대로** 두고 차이를 기록만 한다. 라인박스를 임의로
// 줄이면 토큰 밖 타이포가 하나 생기고, 높이를 고정하면 글자 크기 변화를 안 따라간다.
// 행 높이 공식(16 + 21 + 8 + …)을 쓰는 쪽은 이 2px 을 알고 있어야 한다.

import { type ReactNode } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
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
  | "ink"
  | "onMedia"
export type V2BadgeVariant = "fill" | "weak"
/**
 * 모서리. 기본 `rounded` = size 별 radius 사다리(오늘의 렌더 그대로).
 * `pill` = `radius.full` + xs 의 세로 여백 확대 — 목록의 마이크로 배지용.
 */
export type V2BadgeShape = "rounded" | "pill"

export type V2BadgeProps = {
  /** 배지 라벨 (문자열 권장) */
  children?: ReactNode
  size?: V2BadgeSize
  color?: V2BadgeColor
  variant?: V2BadgeVariant
  /** 모서리 모양. 기본 `rounded`(기존 렌더 유지) */
  shape?: V2BadgeShape
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
    // pill 일 때만 커진다 — 목록의 마이크로 배지가 더 큰 세로 여백을 요구한다(아래 표).
    pillPaddingVertical: spacing[4],
    borderRadius: radius.sm, // 스펙 9 → 8
    text: typography.caption.xSmall, // 10 SemiBold (스펙 10 SemiBold 정확 일치)
  },
  s: {
    paddingHorizontal: spacing[8], // 스펙 7 → 8
    paddingVertical: spacing[2], // 스펙 3 → 2
    pillPaddingVertical: spacing[2],
    borderRadius: radius.md, // 스펙 11 → 10
    text: typography.caption.small, // 11 Medium (스펙 12 근접)
  },
  m: {
    paddingHorizontal: spacing[8], // 스펙 7 → 8
    paddingVertical: spacing[2], // 스펙 3 → 2
    pillPaddingVertical: spacing[2],
    borderRadius: radius.lg, // 스펙 12
    text: typography.label.xSmall, // 13 SemiBold (스펙 13, Bold→SemiBold 근사)
  },
  l: {
    paddingHorizontal: spacing[8], // 스펙 8
    paddingVertical: spacing[4], // 스펙 4
    pillPaddingVertical: spacing[4],
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
    /*
      목록의 마이크로 배지 계열. `neutral` 과 같은 회색 가족이지만 **면이 곧 정의**라
      따로 둔다 — `neutral` 의 두 칸은 이미 앱의 다른 화면 3곳이 쓰고 있고(주차 유·무료,
      검색 제안 종류, 연결 해지), 그 값을 커뮤니티 시안에 맞춰 갈아 끼우면 그 3곳이
      같이 변한다. 새 이름으로 열어 **고른 곳만** 바뀌게 한다.

        fill — 카테고리 배지(`질문·상담`): 잉크 면 + 뒤집힌 글자
        weak — 태그 칩: `fill.normal` 면 + `label.neutral` 글자
                (= 안 고른 `V2Chip` 과 같은 면. 시안이 요구한 `neutral/weak` 면이다)

      **글자가 `static.white` 가 아니라 `background.default`** 인 이유는 `V2Chip` 의
      `neutral` 톤과 같다: 다크의 `label.neutral` 은 **밝은** 회색이라 흰 글자를 얹으면
      회색 면에 흰 글자가 된다. 라이트에서는 두 토큰이 같은 흰색이라 시안과 정확히 같고,
      다크에서만 면과 글자가 서로 뒤집힌다.
    */
    ink: {
      fill: { bg: colors.label.neutral, fg: colors.background.default },
      weak: { bg: colors.fill.normal, fg: colors.label.neutral },
    },
    /*
      사진 위에 얹는 배지(스토리 뷰어 `저염식`). 사진에는 모드가 없으므로 두 모드 모두
      **같은** 흰 면 + 브랜드 글자다 — 그래서 `static.white` 이고, `variant` 축이 없다
      (면이 하나뿐인 것을 두 칸으로 나눠 적으면 없는 선택지를 있는 것처럼 만든다).
    */
    onMedia: {
      fill: { bg: colors.static.white, fg: colors.primary.primary },
      weak: { bg: colors.static.white, fg: colors.primary.primary },
    },
  } as const
  return map[color][variant]
}

export function V2Badge({
  children,
  size = "l",
  color = "brand",
  variant = "fill",
  shape = "rounded",
  style,
}: V2BadgeProps) {
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const { bg, fg } = resolveColors(color, variant, colors)
  const isPill = shape === "pill"

  return (
    <View
      style={[
        styles.base,
        {
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: isPill ? s.pillPaddingVertical : s.paddingVertical,
          borderRadius: isPill ? radius.full : s.borderRadius,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={FONT_SCALE.control}
        style={[s.text, { color: fg }]}
        numberOfLines={1}
      >
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

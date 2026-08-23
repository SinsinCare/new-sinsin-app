// Design System v2 — Progress Bar
// Spec: project/design-system-v2/design-system-base/components/Progress-Bar.md (Figma node 128:7882)
//
// 텍스트 없는 선형 진행 표시기. 트랙(배경) 위에 왼쪽 정렬 fill 레이어를 얹어
// fill 폭 = value% 로 표현. Figma의 3축(Progress/Size/Color)을 RN 관점으로 매핑:
//  - Progress → `value` prop (0~100 연속값, 내부에서 clamp)
//  - Size     → `size` prop (s·m·l → height 2·5·8)
//  - Color    → `color` prop (brand·danger·success·neutral, fill 색만 변경)
//
// 패턴: size→height 룩업 + color→fill 토큰 룩업. 시맨틱 색은 useV2Theme(다크 자동).

import { StyleSheet, View, type ViewStyle } from "react-native"
import { type SemanticColors } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

// 색상 이름은 Figma와 1:1 (축약하지 않음 — 디자인↔코드 바로 대조 가능)
export type V2ProgressBarSize = "s" | "m" | "l"
/**
 * fill 색. `static` 만 Figma 밖이다 — 사진 **위에** 얹히는 진행바(스토리 뷰어)용으로,
 * 두 모드 모두 흰색이다. 사진에는 모드가 없으므로 `label.*` 로 그리면 다크에서
 * 밝은 사진 위에 밝은 회색 바가 되어 사라진다.
 */
export type V2ProgressBarColor =
  | "brand"
  | "danger"
  | "success"
  | "neutral"
  | "static"

export type V2ProgressBarProps = {
  /** 진행률 0~100. 범위를 벗어나면 내부에서 clamp */
  value: number
  size?: V2ProgressBarSize
  color?: V2ProgressBarColor
  style?: ViewStyle
}

// Radius: spec은 사이즈 무관 고정 raw 2.5px (Variable 바인딩 아님).
// radius 스케일 최소값이 xs=4라 정확히 대응되는 토큰이 없어 spec 원값(2.5) 그대로 사용.
const TRACK_RADIUS = 2.5

/** size → 트랙/fill 공통 height (Progress-Bar.md Size 스펙, S/M/L = 2/5/8) */
const SIZE_HEIGHT = {
  s: 2,
  m: 5,
  l: 8,
} as const

/** color → fill 색 토큰 (트랙 색은 4색 공통 fill.normal, fill만 변경) */
function resolveFillColor(
  color: V2ProgressBarColor,
  colors: SemanticColors,
): string {
  const map = {
    brand: colors.primary.primary, // #fe7139 (모드 공통)
    danger: colors.status.negative,
    success: colors.status.positive,
    neutral: colors.label.alternative,
    static: colors.static.white, // 모드 공통 흰색 — 사진 위 전용
  } as const
  return map[color]
}

export function V2ProgressBar({
  value,
  size = "m",
  color = "brand",
  style,
}: V2ProgressBarProps) {
  const { colors } = useV2Theme()
  const height = SIZE_HEIGHT[size]
  const fillColor = resolveFillColor(color, colors)
  // 0~100 clamp 후 fill 폭(%)으로 사용
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[
        styles.track,
        {
          height,
          borderRadius: TRACK_RADIUS,
          backgroundColor: colors.fill.normal,
        },
        style,
      ]}
    >
      {/* fill: 왼쪽 정렬, 트랙과 동일 height·radius, 폭만 value% */}
      <View
        style={{
          height,
          borderRadius: TRACK_RADIUS,
          backgroundColor: fillColor,
          width: `${clamped}%`,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    width: "100%", // 부모 폭으로 늘어남
    overflow: "hidden",
  },
})

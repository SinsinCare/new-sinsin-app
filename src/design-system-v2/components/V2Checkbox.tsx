// Design System v2 — Checkbox
// Spec: project/design-system-v2/design-system-base/components/Checkbox.md (Figma set 94:13145)
//
// Figma의 4축을 RN 관점으로 매핑:
//  - Variant / Size            → props (선언적)
//  - Checked / Disabled        → boolean props
//  - Circle: 채운 원 안에 흰 체크 / Line: 컨테이너 없이 체크마크만
//
// 색은 모두 시맨틱 3토큰(Primary/primary · static/white · label/assistive)만 사용 →
//  useV2Theme(다크 자동)에서 조회. Disabled는 별도 토큰 없이 투명도로만 표현(스펙).
// 벡터는 Figma에서 래스터라이즈되어 선 두께가 토큰에 없음 → 시안 비율 참고해 사이즈 비례로 계산.

import {
  Pressable,
  type PressableProps,
  StyleSheet,
  type ViewStyle,
} from "react-native"
import { Circle, Path, Svg } from "react-native-svg"
import { touchTarget } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

// 이름은 Figma 축과 1:1(축약 없음). Figma 원본의 `LIne` 오타는 스펙대로 `line`으로 정정.
export type V2CheckboxVariant = "circle" | "line"
export type V2CheckboxSize = "xs" | "s" | "m" | "l"

export type V2CheckboxProps = Omit<
  PressableProps,
  "children" | "style" | "onPress"
> & {
  variant?: V2CheckboxVariant
  size?: V2CheckboxSize
  /** 선택 여부 (controlled) */
  checked?: boolean
  disabled?: boolean
  /** 토글 시 다음 값으로 호출 (controlled 핸들러) */
  onChange?: (next: boolean) => void
  style?: ViewStyle
}

/** size → 한 변 px (Checkbox.md Size 스펙, 정사각형) */
const SIZE_PX: Record<V2CheckboxSize, number> = {
  xs: 16,
  s: 20,
  m: 24,
  l: 30,
}

/** 체크마크 3점(start→mid→end)을 한 변 대비 비율로 계산.
 *  circle=원 안에 들어가므로 살짝 inset, line=박스 전체를 채움. */
function checkPath(px: number, inset: boolean): string {
  const p = inset
    ? { x1: 0.28, y1: 0.52, x2: 0.43, y2: 0.68, x3: 0.72, y3: 0.34 }
    : { x1: 0.22, y1: 0.52, x2: 0.42, y2: 0.71, x3: 0.78, y3: 0.31 }
  return `M${p.x1 * px} ${p.y1 * px} L${p.x2 * px} ${p.y2 * px} L${p.x3 * px} ${p.y3 * px}`
}

export function V2Checkbox({
  variant = "circle",
  size = "m",
  checked = false,
  disabled = false,
  onChange,
  style,
  accessibilityState,
  hitSlop: requestedHitSlop,
  ...rest
}: V2CheckboxProps) {
  const { colors } = useV2Theme()
  const px = SIZE_PX[size]
  // 선 두께: 토큰 부재 → 사이즈 비례(대략 1.5~2.4px). 시안 비율 참고 보정.
  const strokeWidth = Math.max(1.5, Math.min(2.4, px * 0.085))

  // 강조색은 Circle=원 채움, Line=체크마크 획으로 쓰임(둘 다 Primary/primary).
  // Unchecked는 Circle 외곽선·옅은 체크, Line 체크마크 모두 label/assistive 한 토큰.
  const markColor = checked
    ? variant === "circle"
      ? colors.static.white
      : colors.primary.primary
    : colors.label.assistive

  // 작은 컨트롤이라 시각 크기와 별개로 최소 터치 타겟(44) 확보 — hit-slop으로 확장.
  const slop = Math.max(0, (touchTarget.min - px) / 2)

  return (
    <Pressable
      {...rest}
      accessibilityRole="checkbox"
      accessibilityState={{ ...accessibilityState, checked, disabled }}
      disabled={disabled}
      hitSlop={requestedHitSlop ?? slop}
      onPress={() => onChange?.(!checked)}
      style={({ pressed }) => [
        { width: px, height: px },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
        {variant === "circle" && (
          <Circle
            cx={px / 2}
            cy={px / 2}
            // Checked=완전 채움(radius = 크기 ÷ 2), Unchecked=획이 밖으로 안 잘리게 반두께만큼 축소
            r={checked ? px / 2 : px / 2 - strokeWidth / 2}
            fill={checked ? colors.primary.primary : "transparent"}
            stroke={checked ? undefined : colors.label.assistive}
            strokeWidth={checked ? 0 : strokeWidth}
          />
        )}
        <Path
          d={checkPath(px, variant === "circle")}
          stroke={markColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // Pressed: 눌림 피드백. 정확한 pressed 토큰 미추출 → opacity 기반(V2Button과 동일).
  pressed: { opacity: 0.85 },
  // Disabled: 스펙상 별도 토큰 없이 투명도↓로만 표현.
  disabled: { opacity: 0.4 },
})

// Design System v2 — Switch
// Spec: project/design-system-v2/design-system-base/components/Switch.md (Figma node 94:13327)
//
// 켜짐/꺼짐을 즉시 토글하는 이진 컨트롤 (값 저장 없이 바로 반영).
// Figma의 2축(Check/Disabled)을 RN 관점으로 매핑:
//  - Check(On/Off) → controlled `value` boolean + `onValueChange`
//  - Disabled      → `disabled` boolean prop
//
// 순수 그래픽 컴포넌트(텍스트/아이콘 없음). 시맨틱 색은 useV2Theme(다크 자동).

import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native"
import { radius, spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

// Switch.md 스펙 치수. thumb 크기·inset·travel은 스크린샷 기하 추정치(보정 §67).
const TRACK_WIDTH = 50
const TRACK_HEIGHT = 30
const THUMB_SIZE = 26
const THUMB_INSET = spacing[2] // 2 — 트랙 안쪽 여백
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2 // 20 (Off↔On)

export type V2SwitchProps = Omit<
  PressableProps,
  "children" | "style" | "onPress"
> & {
  /** 현재 켜짐(true)/꺼짐(false) — controlled */
  value: boolean
  /** 토글 시 다음 값 전달 */
  onValueChange?: (next: boolean) => void
  style?: ViewStyle
}

export function V2Switch({
  value,
  onValueChange,
  disabled = false,
  style,
  accessibilityState,
  ...rest
}: V2SwitchProps) {
  const { colors } = useV2Theme()
  const isDisabled = !!disabled

  // On=Primary/primary, Off=label/disable. Disabled도 동일 토큰 유지 + 전체 opacity dim(보정 §69).
  const trackColor = value ? colors.primary.primary : colors.label.disable

  return (
    <Pressable
      {...rest}
      accessibilityRole="switch"
      accessibilityState={{
        ...accessibilityState,
        checked: value,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      onPress={() => onValueChange?.(!value)}
      style={[
        styles.track,
        { backgroundColor: trackColor },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {/* thumb: 항상 흰색. On이면 오른쪽·Off면 왼쪽에 정적 배치(travel 20). */}
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.static.white,
            left: value ? THUMB_INSET + THUMB_TRAVEL : THUMB_INSET,
          },
        ]}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.full, // pill (height/2)
    justifyContent: "center",
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.full, // circle
  },
  // Disabled: 색 토큰 교체 없이 전체 흐리게(투명도↓). 정확한 dim 토큰 미추출 → opacity 기반(V2Button과 동일).
  disabled: { opacity: 0.4 },
})

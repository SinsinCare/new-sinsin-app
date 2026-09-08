import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 본인인증 화면의 **선택 카드**. 간편인증 수단(카카오/PASS)과 통신사 행이 같이 쓴다.
 *
 * `V2Option` 을 쓰지 않은 이유: `V2Option` 은 아이콘·제목·트레일링이 가로로 늘어서는
 * **행**이고 radius 24 에 좌우 패딩 24 다. 시안(-10)의 인증 수단은 2열 그리드에 글자만
 * 가운데 놓인 **타일**이라, `style` 로 루트만 덮어써도 안쪽 정렬을 못 바꾼다.
 * `V2Chip` 은 선택 시 면을 불투명 주황으로 채우고 글자를 흰색으로 바꾸는데 시안은
 * 옅은 주황 면 + 주황 글자다.
 *
 * 색은 전부 토큰이다. 시안 픽셀과 대조한 결과 선택 상태의 면은 흰색이 아니라
 * `primary.primaryWeak`(흰 면 위 반투명 주황)이고, 미선택 면은 `fill.background` 다.
 */

import { Pressable, StyleSheet, type ViewStyle } from "react-native"

import {
  borderWidth,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

export interface AuthChoiceCardProps {
  label: string
  selected: boolean
  onPress: () => void
  /** 통신사 행은 3열이라 같은 높이면 화면을 다 잡아먹는다. 낮은 변형. */
  compact?: boolean
  disabled?: boolean
  style?: ViewStyle
}

/** 시안(-10) 실측: 2열 인증 수단 타일은 72, 통신사 3열은 그 아래 보조 행이라 낮게. */
const HEIGHT = { default: 72, compact: touchTarget.min + spacing[4] } as const

export function AuthChoiceCard({
  label,
  selected,
  onPress,
  compact = false,
  disabled = false,
  style,
}: AuthChoiceCardProps) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: compact ? HEIGHT.compact : HEIGHT.default,
          backgroundColor: selected
            ? colors.primary.primaryWeak
            : colors.fill.background,
          // 테두리는 두 상태 모두 1px 로 두고 색만 바꾼다 — 선택할 때 폭이 흔들리지 않게.
          borderColor: selected ? colors.primary.primary : "transparent",
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          // 글자 무게는 선택 여부와 무관하게 고정 — 무게가 바뀌면 폭이 바뀌어 글자가 튄다.
          compact ? typography.label.small : typography.label.medium,
          { color: selected ? colors.primary.primary : colors.label.neutral },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
  },
  // 눌림 피드백은 색이 아니라 opacity — DS 전체가 같은 규칙이다.
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
})

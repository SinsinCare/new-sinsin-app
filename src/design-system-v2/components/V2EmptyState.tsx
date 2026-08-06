// Design System v2 — EmptyState
// 빈 상태 플레이스홀더. 세로 중앙 정렬 스택으로
// (옵션)아이콘 → 제목 → (옵션)설명 → (옵션)액션 버튼을 조립한다.
// Figma 스펙 없음 — 설명 + 토큰으로 설계. 조립은 직접 경로(V2Icon/V2Button).

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import type { V2IconName } from "../icons"
import { V2Button } from "./V2Button"

export type V2EmptyStateProps = {
  /** 상단 일러스트 아이콘 (기본 없음). 있으면 size 2xl(40) + label.assistive 색 */
  icon?: V2IconName
  /** 제목 (필수). title.small(20 Bold) 가운데정렬 */
  title: string
  /** 보조 설명 (옵션). body.mediumWeak(17) 가운데정렬, 여러 줄 wrap */
  description?: string
  /** 액션 버튼 라벨 (옵션). onAction과 함께 있어야 버튼 노출 */
  actionLabel?: string
  /** 액션 콜백 (옵션). actionLabel과 함께 brand/fill/m 버튼 조립 */
  onAction?: () => void
  style?: ViewStyle
}

export function V2EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: V2EmptyStateProps) {
  const { colors } = useV2Theme()
  // 라벨과 콜백이 모두 있을 때만 액션 노출
  const showAction = Boolean(actionLabel && onAction)

  return (
    <View style={[styles.container, style]}>
      {icon && <V2Icon name={icon} size="2xl" color={colors.label.assistive} />}

      <Text
        style={[
          typography.title.small,
          styles.title,
          { color: colors.label.normal },
        ]}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {title}
      </Text>

      {description && (
        <Text
          style={[
            typography.body.mediumWeak,
            styles.description,
            { color: colors.label.neutral },
          ]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {description}
        </Text>
      )}

      {showAction && (
        <View style={styles.action}>
          <V2Button color="brand" variant="fill" size="m" onPress={onAction}>
            {actionLabel}
          </V2Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    padding: spacing[24],
  },
  title: { textAlign: "center" },
  description: { textAlign: "center" },
  // 액션은 스택 gap 위에 추가 상단 여백을 얹어 시각적으로 분리
  action: { marginTop: spacing[8] },
})

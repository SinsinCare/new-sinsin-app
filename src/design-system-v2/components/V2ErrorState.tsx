// Design System v2 — ErrorState (오류 상태)
// No Figma spec — 설명 + 토큰으로 설계.
//
// 데이터 로드 실패·예외 등 오류 상황을 세로 중앙 스택으로 안내:
//   아이콘(기본 caution) → 제목 → (옵션)설명 → (옵션)재시도 버튼.
// 재시도(onRetry)가 있을 때만 하단에 V2Button을 노출한다.

import { type ViewStyle, StyleSheet, Text, View } from "react-native"
import { spacing, typography } from "../tokens"
import { type V2IconName } from "../icons"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Button } from "./V2Button"
import { V2Icon } from "./V2Icon"

export type V2ErrorStateProps = {
  /** 상단 아이콘. 기본 'caution' (status.negative 색으로 칠함) */
  icon?: V2IconName
  /** 제목. 기본 "문제가 발생했어요" */
  title?: string
  /** 부가 설명 (옵션) */
  description?: string
  /** 재시도 콜백. 넘기면 하단에 "다시 시도" 버튼 노출 */
  onRetry?: () => void
  /** 재시도 버튼 라벨 override. 기본 "다시 시도" */
  retryLabel?: string
  style?: ViewStyle
}

export function V2ErrorState({
  icon = "caution",
  title = "문제가 발생했어요",
  description,
  onRetry,
  retryLabel = "다시 시도",
  style,
}: V2ErrorStateProps) {
  const { colors } = useV2Theme()

  return (
    <View style={[styles.root, style]}>
      {/* 아이콘: 2xl(40) + 부정 상태색 */}
      <V2Icon name={icon} size="2xl" color={colors.status.negative} />

      <Text style={[styles.title, { color: colors.label.normal }]}>
        {title}
      </Text>

      {description ? (
        <Text style={[styles.description, { color: colors.label.neutral }]}>
          {description}
        </Text>
      ) : null}

      {onRetry ? (
        // 재시도 버튼: neutral/weak/m. 스택 gap(12) 위에 8을 더해 여백 확보.
        <View style={styles.retry}>
          <V2Button color="neutral" variant="weak" size="m" onPress={onRetry}>
            {retryLabel}
          </V2Button>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    padding: spacing[24],
  },
  title: {
    ...typography.title.small, // 20 Bold
    textAlign: "center",
  },
  description: {
    ...typography.body.mediumWeak, // 17 Regular
    textAlign: "center",
  },
  // 재시도 버튼 위 추가 여백 (스택 gap 위에 +8)
  retry: {
    marginTop: spacing[8],
  },
})

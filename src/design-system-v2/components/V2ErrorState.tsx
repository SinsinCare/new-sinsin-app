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

type V2ErrorStateBaseProps = {
  /** 상단 아이콘. 기본 'caution' (status.negative 색으로 칠함) */
  icon?: V2IconName
  /** 사용자가 처한 상황을 구체적으로 설명하는 제목 */
  title: string
  /** 부가 설명 (옵션) */
  description?: string
  style?: ViewStyle
}

export type V2ErrorStateProps = V2ErrorStateBaseProps &
  (
    | {
        /** 사용자가 이 화면에서 바로 복구할 수 있을 때만 제공 */
        onRetry: () => void
        /** 실제 행동을 나타내는 라벨. 예: "다시 불러오기" */
        retryLabel: string
      }
    | {
        onRetry?: undefined
        retryLabel?: never
      }
  )

export function V2ErrorState(props: V2ErrorStateProps) {
  const {
    icon = "caution",
    title,
    description,
    onRetry,
    retryLabel,
    style,
  } = props
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

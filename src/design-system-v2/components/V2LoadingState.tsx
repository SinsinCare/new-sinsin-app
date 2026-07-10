// Design System v2 — LoadingState
// 로딩 상태 표시. RN ActivityIndicator + (옵션) 메시지.
//
// 두 가지 레이아웃:
//  - fullscreen=true  → flex:1 + 배경 background.default + 화면 중앙 (전체 화면 로딩)
//  - fullscreen=false → inline 중앙 정렬 + 패딩 (섹션/카드 내부 로딩, 기본값)
//
// 스피너 색은 시맨틱 primary.primary(useV2Theme, 다크 자동), 메시지는 label.neutral.

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import { spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2LoadingStateProps = {
  /** 스피너 아래 표시할 안내 메시지 (없으면 스피너만) */
  message?: string
  /** true면 flex:1 + 배경으로 화면 전체를 채워 중앙 정렬. 기본 false(inline) */
  fullscreen?: boolean
  /** 스피너 크기. 기본 'large' */
  size?: "small" | "large"
  style?: ViewStyle
}

export function V2LoadingState({
  message,
  fullscreen = false,
  size = "large",
  style,
}: V2LoadingStateProps) {
  const { colors } = useV2Theme()

  return (
    <View
      accessibilityRole="progressbar"
      style={[
        styles.base,
        fullscreen
          ? { flex: 1, backgroundColor: colors.background.default }
          : null,
        style,
      ]}
    >
      <ActivityIndicator color={colors.primary.primary} size={size} />
      {message ? (
        <Text style={[styles.message, { color: colors.label.neutral }]}>
          {message}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[24],
  },
  message: {
    ...typography.subtext.large,
    marginTop: spacing[12],
    textAlign: "center",
  },
})

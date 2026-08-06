// Design System v2 — LoadingState
// 스켈레톤을 그릴 수 없을 때만 쓰는 마지막 수단. (옵션) 메시지 + 점 로더.
//
// 두 가지 레이아웃:
//  - fullscreen=true  → flex:1 + 배경 background.default + 화면 중앙 (전체 화면 로딩)
//  - fullscreen=false → inline 중앙 정렬 + 패딩 (섹션/카드 내부 로딩, 기본값)
//
// ## 왜 링이 아니라 점인가
//
// 링 스피너는 플랫폼 기본 위젯이라 브랜드가 없고, 무엇이 오는지도 말하지 않는다.
// 결과의 모양을 알 수 있는 자리라면 여기가 아니라 `V2Skeleton` 을 써야 한다 —
// 이 컴포넌트는 모양을 예측할 수 없는 경우(예: AI 응답 대기)에만 남긴다.
//
// 점 색은 시맨틱 primary.primary(useV2Theme, 다크 자동), 메시지는 label.neutral.

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2DotLoader } from "./V2DotLoader"

export type V2LoadingStateProps = {
  /** 점 아래 표시할 안내 메시지 (없으면 점만) */
  message?: string
  /** true면 flex:1 + 배경으로 화면 전체를 채워 중앙 정렬. 기본 false(inline) */
  fullscreen?: boolean
  /** 로더 크기. 기본 'large' */
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
      <V2DotLoader
        color={colors.primary.primary}
        size={size === "small" ? "s" : "m"}
      />
      {message ? (
        <Text
          style={[styles.message, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
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

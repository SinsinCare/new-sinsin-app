// Design System v2 — Screen (레이아웃)
// Figma 컴포넌트가 아니라 화면 스캐폴드: safe-area + 배경 + (고정/스크롤) + 키보드 회피.
// 계획서 foundation.md의 V2Screen(상태: fixed / scroll / keyboard).

import { type ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native"
import { SafeAreaView, type Edge } from "react-native-safe-area-context"
import { spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

export type V2ScreenProps = {
  children: ReactNode
  /** 스크롤 가능 여부 (기본 false = 고정 레이아웃) */
  scroll?: boolean
  /** 배경 톤 (기본 default) */
  tone?: "default" | "lower"
  /** safe-area 적용 엣지 (기본 전체) */
  edges?: readonly Edge[]
  /** 입력 화면용 키보드 회피 래핑 */
  keyboardAvoiding?: boolean
  /** 콘텐츠 좌우 패딩 (기본 spacing[24]; false면 0) */
  padded?: boolean
  style?: ViewStyle
  contentContainerStyle?: ViewStyle
  scrollProps?: ScrollViewProps
}

const DEFAULT_EDGES: readonly Edge[] = ["top", "bottom", "left", "right"]

export function V2Screen({
  children,
  scroll = false,
  tone = "default",
  edges = DEFAULT_EDGES,
  keyboardAvoiding = false,
  padded = true,
  style,
  contentContainerStyle,
  scrollProps,
}: V2ScreenProps) {
  const { colors } = useV2Theme()
  const backgroundColor =
    tone === "lower" ? colors.background.lower : colors.background.default
  const pad = padded ? styles.padded : null

  const content = scroll ? (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, pad, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, pad, contentContainerStyle]}>{children}</View>
  )

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  )

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor }, style]}
      edges={edges}
    >
      {body}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing[24] },
})

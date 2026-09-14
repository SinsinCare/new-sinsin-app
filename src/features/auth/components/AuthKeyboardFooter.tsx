import type { ReactNode } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { V2IconButton } from "@/src/design-system-v2"
import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility"
import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"
import { getAuthKeyboardFooterPadding } from "./authKeyboardFooterLayout"

interface AuthKeyboardFooterProps {
  children: ReactNode
  horizontalPadding?: number
  backgroundColor?: string
}

/**
 * 키보드 위에 붙는 하단 CTA 바.
 *
 * 키보드가 열렸을 때의 여백 차이를 `offset`(=transform)으로 상쇄하면 버튼이 그려지는
 * 자리와 눌리는 자리가 어긋난다 — 시뮬레이터에서 CTA 아래쪽 ~45pt 가 먹통이었다.
 * 그래서 이동은 KeyboardStickyView 에 맡기고 여백은 padding 으로만 바꾼다.
 * padding 은 레이아웃이라 터치 영역이 함께 따라온다.
 *
 * ## 전역 키보드 툴바를 끈다
 *
 * 이 바는 **자기 도크**다(`keyboardToolbarStore` 머리말의 조건). 끄지 않으면 전역
 * "완료" 툴바가 같은 자리(키보드 바로 위)에 한 겹 더 얹혀 CTA 를 덮는다 — 사용자가
 * 누르는 "완료"는 키보드만 내리고, 실제 버튼(인증하기·완료)은 뒤에 가려져 한 번도
 * 눌리지 않는다(2026-09-11 비밀번호 재설정 녹화·시뮬레이터 재현). 설정 폼
 * `SettingsFormActions` 와 같은 규칙으로 끄고, 숫자 키패드(인증번호)의 탈출구는
 * 키보드가 열려 있는 동안 CTA 옆에 두는 **키보드 내리기** 버튼이 맡는다.
 */
export function AuthKeyboardFooter({
  children,
  horizontalPadding = 0,
  backgroundColor,
}: AuthKeyboardFooterProps) {
  useSuppressGlobalKeyboardToolbar()
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardVisibility()
  const padding = getAuthKeyboardFooterPadding(insets.bottom)
  const { t } = useTranslation("common")

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <View
        style={[
          styles.container,
          {
            paddingBottom: isKeyboardVisible ? padding.opened : padding.closed,
            paddingHorizontal: horizontalPadding,
            backgroundColor,
          },
        ]}
      >
        {isKeyboardVisible && (
          <View style={styles.dismiss}>
            <V2IconButton
              name="chevronDown"
              accessibilityLabel={t("keyboard.dismiss")}
              onPress={Keyboard.dismiss}
              size="l"
            />
          </View>
        )}
        <View style={styles.action}>{children}</View>
      </View>
    </KeyboardStickyView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    // 자식은 오류 문구 + CTA 가 세로로 쌓인다. 내리기 버튼은 CTA 줄에 맞춘다.
    alignItems: "flex-end",
    gap: 12,
  },
  dismiss: { paddingBottom: 2 },
  action: { flex: 1 },
})

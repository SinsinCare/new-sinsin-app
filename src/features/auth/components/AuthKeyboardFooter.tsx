import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility"
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
 */
export function AuthKeyboardFooter({
  children,
  horizontalPadding = 0,
  backgroundColor,
}: AuthKeyboardFooterProps) {
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardVisibility()
  const padding = getAuthKeyboardFooterPadding(insets.bottom)

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
        {children}
      </View>
    </KeyboardStickyView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
})

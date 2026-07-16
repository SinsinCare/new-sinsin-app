import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility"
import { getAuthKeyboardFooterBottomPadding } from "./authKeyboardFooterLayout"

interface AuthKeyboardFooterProps {
  children: ReactNode
  horizontalPadding?: number
  backgroundColor?: string
}

export function AuthKeyboardFooter({
  children,
  horizontalPadding = 0,
  backgroundColor,
}: AuthKeyboardFooterProps) {
  const insets = useSafeAreaInsets()
  // iOS phone-pad can move the sticky view while animated progress still
  // reports the closed state, so visibility events own the footer padding.
  const isKeyboardVisible = useKeyboardVisibility()

  const paddingBottom = getAuthKeyboardFooterBottomPadding(
    insets.bottom,
    isKeyboardVisible,
  )

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <View
        style={[
          styles.container,
          {
            paddingBottom,
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

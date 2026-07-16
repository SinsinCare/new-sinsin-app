import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getAuthKeyboardFooterLayout } from "./authKeyboardFooterLayout"

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
  const layout = getAuthKeyboardFooterLayout(insets.bottom)

  return (
    <KeyboardStickyView offset={layout.offset}>
      <View
        style={[
          styles.container,
          {
            paddingBottom: layout.paddingBottom,
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

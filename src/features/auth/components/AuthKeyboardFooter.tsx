import type { ReactNode } from "react"
import { Animated, StyleSheet } from "react-native"
import {
  KeyboardStickyView,
  useKeyboardAnimation,
} from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getAuthKeyboardFooterPadding } from "./authKeyboardFooterLayout"

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
  const { progress } = useKeyboardAnimation()
  const padding = getAuthKeyboardFooterPadding(insets.bottom)
  const paddingBottom = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [padding.closed, padding.opened],
  })

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <Animated.View
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
      </Animated.View>
    </KeyboardStickyView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
})

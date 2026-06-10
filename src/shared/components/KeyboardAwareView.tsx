import type { ReactNode } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  type KeyboardAvoidingViewProps,
} from "react-native"

type KeyboardAwareViewProps = Omit<KeyboardAvoidingViewProps, "behavior"> & {
  children: ReactNode
  androidBehavior?: KeyboardAvoidingViewProps["behavior"]
  iosBehavior?: KeyboardAvoidingViewProps["behavior"]
}

export function KeyboardAwareView({
  children,
  style,
  keyboardVerticalOffset = 0,
  iosBehavior = "padding",
  androidBehavior = "height",
  ...props
}: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      {...props}
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? iosBehavior : androidBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  )
}

import { useCallback } from "react"
import { Keyboard } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { StatusBar, setStatusBarStyle } from "expo-status-bar"
import { V2ScreenHeader, useV2Theme } from "@/src/design-system-v2"
import type { V2ScreenHeaderProps } from "@/src/design-system-v2/components/V2ScreenHeader"

export function SettingsDetailHeader(props: V2ScreenHeaderProps) {
  const { mode } = useV2Theme()
  const style = mode === "dark" ? "light" : "dark"
  useFocusEffect(
    useCallback(() => {
      const applyStyle = () => setStatusBarStyle(style)
      applyStyle()
      const shown = Keyboard.addListener("keyboardDidShow", applyStyle)
      const hidden = Keyboard.addListener("keyboardDidHide", applyStyle)
      return () => {
        shown.remove()
        hidden.remove()
      }
    }, [style]),
  )
  return (
    <>
      <StatusBar style={style} />
      <V2ScreenHeader {...props} />
    </>
  )
}

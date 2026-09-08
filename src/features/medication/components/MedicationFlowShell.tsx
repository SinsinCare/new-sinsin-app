import { useEffect, useState, type ReactNode } from "react"
import { useIsFocused } from "@react-navigation/native"
import { View, StatusBar, useWindowDimensions } from "react-native"
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller"
import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"
import { V2ScreenHeader } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { medStyles, S } from "./medicationStyles"
export function MedicationFlowShell({
  title,
  onBack,
  children,
  footer,
}: {
  title: string
  onBack: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useSuppressGlobalKeyboardToolbar()
  const { fontScale } = useWindowDimensions()
  const [footerHeight, setFooterHeight] = useState(100)
  const s = useSurface(),
    insets = useSafeAreaInsets(),
    focused = useIsFocused()
  useEffect(() => {
    if (focused)
      StatusBar.setBarStyle(s.isDark ? "light-content" : "dark-content")
  }, [focused, s.isDark])
  return (
    <View style={{ flex: 1, backgroundColor: s.canvas }}>
      <V2ScreenHeader title={title} onBack={onBack} separator />
      <KeyboardAwareScrollView
        key={`medication-type-${fontScale}`}
        bottomOffset={footerHeight + S[3]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          medStyles.body,
          {
            paddingTop: S[5],
            paddingBottom: footer ? footerHeight + S[7] : insets.bottom + S[7],
            flexGrow: 1,
          },
        ]}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView
          offset={{ opened: insets.bottom }}
          onLayout={(event) =>
            setFooterHeight(Math.ceil(event.nativeEvent.layout.height))
          }
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: S[5],
            paddingTop: S[3],
            paddingBottom: insets.bottom + S[4],
            backgroundColor: s.canvas,
          }}
        >
          {footer}
        </KeyboardStickyView>
      ) : null}
    </View>
  )
}

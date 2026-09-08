import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { FORM, S } from "./recordPageSpec"
import { recordInk } from "./recordInk"

/** Reserve two text lines so validation does not move the next input or choice. */
export function RecordFieldHint({
  children,
  error = false,
}: {
  children: string
  error?: boolean
}) {
  const s = useSurface()
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  return (
    <View
      style={[styles.slot, { minHeight: FORM.hint.lineHeight * fontScale * 2 }]}
    >
      <V2Text
        style={FORM.hint}
        color={error ? recordInk(s.isDark).errorText : s.text}
        accessibilityLiveRegion="polite"
      >
        {children}
      </V2Text>
    </View>
  )
}
const styles = StyleSheet.create({ slot: { marginTop: S[2] } })

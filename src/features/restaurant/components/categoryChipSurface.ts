import type { TextStyle, ViewStyle } from "react-native"
import { typography } from "@/src/design-system-v2/tokens/typography"
import { FLOATING_SHADOW, mapOverlayChrome } from "./mapFloating"
export type RailChipPalette = {
  primary: { primary: string; primaryWeak: string }
  label: { normal: string }
  background: { default: string; lower: string }
  line: { alternative: string }
}
export interface RailChipSurface {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  shadow: ViewStyle
  color: string
  typography: TextStyle
}
export function railChipSurface({
  active,
  mode,
  colors,
}: {
  active: boolean
  mode: "light" | "dark"
  colors: RailChipPalette
}): RailChipSurface {
  const chrome = mapOverlayChrome({ mode, ...colors })
  return {
    backgroundColor: active
      ? colors.label.normal
      : (chrome.backgroundColor as string),
    borderColor: active ? colors.label.normal : (chrome.borderColor as string),
    borderWidth: 1,
    shadow: FLOATING_SHADOW,
    color: active ? colors.background.default : colors.label.normal,
    typography: active ? typography.label.xSmall : typography.label.xSmallWeak,
  }
}

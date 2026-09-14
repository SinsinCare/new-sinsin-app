import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { semantic } from "@/src/design-system-v2/tokens/colors"
import { getSurfaceLayers } from "@/src/design-system-v2/tokens/layers"

/** Settings detail surfaces share the same semantic contrast as the account tab. */
export function useSettingsColors() {
  const mode = useAppColorScheme()
  const colors = semantic[mode]
  const { planes, basePlane } = getSurfaceLayers(mode === "dark")
  return {
    isDark: mode === "dark",
    bg: planes[basePlane],
    cardBg: planes.content,
    secondaryBg: colors.fill.alternative,
    inputBg: colors.fill.normal,
    pressedBg: colors.fill.normal,
    text: colors.label.normal,
    textSub: colors.label.neutral,
    textTertiary: colors.label.neutral,
    textMuted: colors.label.neutral,
    border: colors.line.neutral,
    divider: colors.line.neutral,
    icon: colors.label.neutral,
    modalBg: colors.background.default,
  }
}

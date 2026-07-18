import { useV2Theme } from "@/src/design-system-v2"

/**
 * Health screens are still composed from legacy React Native views, so this
 * hook is the feature-owned bridge to the v2 semantic theme. Keeping the
 * mapping here prevents each screen from inventing separate dark-mode colors.
 */
export function useHealthTheme() {
  const theme = useV2Theme()
  const { colors } = theme

  return {
    ...theme,
    healthColors: {
      background: colors.background.default,
      surface: colors.background.floated,
      surfaceMuted: colors.fill.background,
      surfacePressed: colors.fill.pressed,
      text: colors.label.normal,
      textStrong: colors.label.strong,
      textSecondary:
        theme.mode === "dark"
          ? theme.primitives.grayscale[400]
          : theme.primitives.grayscale[600],
      textAssistive:
        theme.mode === "dark"
          ? theme.primitives.grayscale[500]
          : theme.primitives.grayscale[500],
      line: colors.line.normal,
      lineSubtle: colors.line.alternative,
      positive: colors.status.positive,
      positiveWeak: colors.accentForeground.greenWeak,
      negative: colors.status.negative,
      negativeWeak: colors.accentForeground.redWeak,
      cautionary: colors.status.cautionary,
      cautionaryWeak: colors.accentForeground.orangeWeak,
      staticWhite: colors.static.white,
    },
  }
}

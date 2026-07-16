import type { V2Theme } from "@/src/design-system-v2/theme"

export function getRestaurantReportPalette(theme: V2Theme) {
  return {
    bg: theme.colors.background.lower,
    card: theme.colors.background.default,
    text: theme.colors.label.normal,
    subText: theme.colors.label.neutral,
    cardBorder: theme.colors.line.strong,
    fieldBorder: theme.colors.line.normal,
    input: theme.colors.background.default,
    section: theme.colors.fill.alternative,
    errorText: theme.colors.status.negative,
    errorBackground: theme.colors.fill.normal,
    action: theme.colors.status.positive,
  }
}

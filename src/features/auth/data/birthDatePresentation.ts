import type { V2Theme } from "@/src/design-system-v2/theme"

export function getBirthDatePickerPalette(theme: V2Theme) {
  return {
    label: theme.colors.label.normal,
    text: theme.colors.label.normal,
    placeholder: theme.colors.label.assistive,
    background: theme.colors.background.default,
    border: theme.colors.line.normal,
    error: theme.colors.status.negative,
  }
}

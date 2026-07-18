import { resolveTheme } from "../src/design-system-v2/theme"
import { getBirthDatePickerPalette } from "../src/features/auth/data/birthDatePresentation"

describe("auth field presentation", () => {
  it.each(["light", "dark"] as const)(
    "uses semantic birth date field colors in %s mode",
    (mode) => {
      const theme = resolveTheme(mode)
      const palette = getBirthDatePickerPalette(theme)

      expect(palette.label).toBe(theme.colors.label.normal)
      expect(palette.text).toBe(theme.colors.label.normal)
      expect(palette.placeholder).toBe(theme.colors.label.assistive)
      expect(palette.background).toBe(theme.colors.background.default)
      expect(palette.border).toBe(theme.colors.line.normal)
    },
  )

  it("does not reuse the light field colors in dark mode", () => {
    const light = getBirthDatePickerPalette(resolveTheme("light"))
    const dark = getBirthDatePickerPalette(resolveTheme("dark"))

    expect(dark.background).not.toBe(light.background)
    expect(dark.text).not.toBe(light.text)
  })
})

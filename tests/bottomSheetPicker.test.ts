import { getBottomSheetPickerColors } from "../src/shared/components/BottomSheetPicker"
import { tokens } from "../src/theme/tokens"

describe("BottomSheetPicker selected palette", () => {
  it("uses the light green selection palette", () => {
    const colors = getBottomSheetPickerColors(false)

    expect(colors.selectedBg).toBe("#F0FDF4")
    expect(colors.selectedText).toBe(tokens.color.sub8.val)
  })

  it("uses a green-tinted selection palette in dark mode", () => {
    const colors = getBottomSheetPickerColors(true)

    expect(colors.selectedBg).toBe(`${tokens.color.sub8.val}20`)
    expect(colors.selectedText).toBe(tokens.color.sub8.val)
  })
})

import {
  getBottomSheetContentPadding,
  getBottomSheetPalette,
  getTamaguiSheetPosition,
  getTamaguiSheetSnapPoints,
} from "../src/shared/utils/appBottomSheet"

describe("app bottom sheet utilities", () => {
  it("keeps content above Android system navigation by adding the safe-area inset", () => {
    expect(getBottomSheetContentPadding(24)).toBe(40)
  })

  it("uses a minimum bottom padding when the device has no bottom inset", () => {
    expect(getBottomSheetContentPadding(0)).toBe(16)
  })

  it("uses separated dark sheet and overlay colors", () => {
    expect(getBottomSheetPalette(true)).toEqual({
      background: "#2A2A32",
      handle: "#858591",
      overlay: "rgba(0,0,0,0.48)",
    })
  })

  it("passes snap points to Tamagui from highest to lowest", () => {
    expect(getTamaguiSheetSnapPoints([48, 68, 88])).toEqual([88, 68, 48])
  })

  it("keeps the public initial snap index mapped to the provided snap point", () => {
    expect(getTamaguiSheetPosition([48, 68, 88], 0)).toBe(2)
    expect(getTamaguiSheetPosition([48, 68, 88], 1)).toBe(1)
    expect(getTamaguiSheetPosition([48, 68, 88], 2)).toBe(0)
  })
})

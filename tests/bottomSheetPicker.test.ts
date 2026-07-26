import {
  getWheelPickerIndex,
  getWheelPickerValueAtOffset,
  resolveWheelPickerValue,
} from "../src/shared/components/bottomSheetPickerModel"

const options = [
  { label: "앱스토어 검색", value: "APP_STORE" },
  { label: "병원", value: "HOSPITAL" },
  { label: "블로그", value: "BLOG" },
]

describe("BottomSheetPicker wheel model", () => {
  it("restores a committed option and falls back to the first option", () => {
    expect(resolveWheelPickerValue("HOSPITAL", options)).toBe("HOSPITAL")
    expect(resolveWheelPickerValue("", options)).toBe("APP_STORE")
  })

  it("resolves the selected index for opening the wheel", () => {
    expect(getWheelPickerIndex("BLOG", options)).toBe(2)
    expect(getWheelPickerIndex("UNKNOWN", options)).toBe(0)
  })

  it("snaps offsets to a bounded option", () => {
    expect(getWheelPickerValueAtOffset(0, 48, options)).toBe("APP_STORE")
    expect(getWheelPickerValueAtOffset(52, 48, options)).toBe("HOSPITAL")
    expect(getWheelPickerValueAtOffset(999, 48, options)).toBe("BLOG")
    expect(getWheelPickerValueAtOffset(-100, 48, options)).toBe("APP_STORE")
  })
})

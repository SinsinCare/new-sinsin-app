import React from "react"
import {
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from "react-native"
import { TextInput } from "../src/design-system-v2/primitives/NativeText"
import { V2SheetTextInput } from "../src/design-system-v2/components/V2SheetTextInput"
import { inputMetrics } from "../src/design-system-v2/primitives/inputMetrics"

const { renderToStaticMarkup } = jest.requireActual("react-dom/server") as {
  renderToStaticMarkup: (node: React.ReactNode) => string
}
const mockInputs: (TextInputProps & { kind: string; forwardedRef: unknown })[] =
  []
jest.mock("react-native", () => ({
  ...jest.requireActual("./helpers/reactNativeStub.js"),
  TextInput: jest
    .requireActual("react")
    .forwardRef((props: TextInputProps, ref: unknown) => {
      mockInputs.push({ ...props, kind: "native", forwardedRef: ref })
      return null
    }),
}))
jest.mock("@gorhom/bottom-sheet", () => ({
  BottomSheetTextInput: jest
    .requireActual("react")
    .forwardRef((props: TextInputProps, ref: unknown) => {
      mockInputs.push({ ...props, kind: "sheet", forwardedRef: ref })
      return null
    }),
}))
beforeEach(() => mockInputs.splice(0))

test("final caller overrides cannot reintroduce paragraph metrics into single-line inputs", () => {
  const base = {
    fontFamily: "Pretendard-Regular",
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
  }
  const style: StyleProp<TextStyle> = [
    base,
    [false, { lineHeight: 36, color: "white", flex: 1 }],
  ]
  expect(inputMetrics(style)).toEqual({
    fontFamily: base.fontFamily,
    fontSize: 16,
    padding: 16,
    color: "white",
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  })
  expect(base.lineHeight).toBe(24)
})

test("multiline editors retain their paragraph spacing, padding and intentional top alignment", () => {
  const style = [
    { fontSize: 17, lineHeight: 26 },
    { textAlignVertical: "top" as const, paddingVertical: 8 },
  ]
  expect(inputMetrics(style, true)).toBe(style)
  expect(StyleSheet.flatten(inputMetrics(style, true))).toMatchObject({
    lineHeight: 26,
    textAlignVertical: "top",
  })
})

test.each(["page", "sheet"])(
  "page and sheet inputs preserve refs, editing callbacks and keyboard props through normalization",
  (kind) => {
    const ref = jest.fn()
    const onFocus = jest.fn(),
      onBlur = jest.fn(),
      onChangeText = jest.fn()
    const props: TextInputProps = {
      value: "",
      placeholder: "복용량",
      style: { fontSize: 16, lineHeight: 24 },
      onFocus,
      onBlur,
      onChangeText,
      keyboardType: "decimal-pad",
      returnKeyType: "done",
    }
    renderToStaticMarkup(
      kind === "page"
        ? React.createElement(TextInput, { ...props, ref })
        : React.createElement(V2SheetTextInput, { ...props, ref }),
    )
    const input = mockInputs[0]!
    expect(input).toMatchObject({
      value: "",
      placeholder: "복용량",
      keyboardType: "decimal-pad",
      returnKeyType: "done",
      maxFontSizeMultiplier: 1.3,
    })
    expect(input.forwardedRef).toBe(ref)
    expect(StyleSheet.flatten(input.style)?.lineHeight).toBeUndefined()
    input.onChangeText!("1.5")
    input.onChangeText!("")
    expect(onChangeText.mock.calls).toEqual([["1.5"], [""]])
    expect(input.onFocus).toBe(onFocus)
    expect(input.onBlur).toBe(onBlur)
  },
)

test("sheet text areas retain gorhom's input implementation and caller accessibility settings", () => {
  renderToStaticMarkup(
    React.createElement(V2SheetTextInput, {
      multiline: true,
      style: { lineHeight: 26, textAlignVertical: "top" },
      maxFontSizeMultiplier: 1.5,
      accessibilityLabel: "댓글",
    }),
  )
  expect(mockInputs[0]).toMatchObject({
    kind: "sheet",
    multiline: true,
    maxFontSizeMultiplier: 1.5,
    accessibilityLabel: "댓글",
    style: { lineHeight: 26, textAlignVertical: "top" },
  })
})

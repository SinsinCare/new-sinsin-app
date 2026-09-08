import React from "react"
import { Text, TextInput } from "../src/design-system-v2/primitives/NativeText"
import {
  effectiveTextScale,
  FONT_SCALE,
} from "../src/design-system-v2/tokens/fontScaling"
const { renderToStaticMarkup } = jest.requireActual("react-dom/server") as {
  renderToStaticMarkup: (node: React.ReactNode) => string
}
const mockRendered: {
  kind: string
  maxFontSizeMultiplier: number
  style?: unknown
  allowFontScaling?: boolean
}[] = []
jest.mock("react-native", () => ({
  useWindowDimensions: () => ({ fontScale: 1 }),
  StyleSheet: {
    flatten: (style: unknown) =>
      Array.isArray(style) ? Object.assign({}, ...style) : style,
  },
  Text: (props: Record<string, unknown>) => {
    mockRendered.push({ kind: "text", ...props } as never)
    return jest
      .requireActual("react")
      .createElement("span", null, props.children)
  },
  TextInput: (props: Record<string, unknown>) => {
    mockRendered.push({ kind: "input", ...props } as never)
    return null
  },
}))
beforeEach(() => mockRendered.splice(0))
test("normal typography remains unchanged; extreme device scale is bounded per role", () => {
  const style = { fontSize: 28, lineHeight: 38, fontFamily: "Existing font" }
  renderToStaticMarkup(React.createElement(Text, { style }, "제목"))
  expect(mockRendered[0]?.style).toEqual(style)
  expect(mockRendered[0]?.maxFontSizeMultiplier).toBe(1.25)
  expect(effectiveTextScale(1, FONT_SCALE.body)).toBe(1)
  expect(effectiveTextScale(3.1, FONT_SCALE.body)).toBe(1.5)
  expect(effectiveTextScale(3.1, FONT_SCALE.control)).toBe(1.3)
})
test("inline emphasis inherits the title limit without enlarging just the colored word", () => {
  renderToStaticMarkup(
    React.createElement(
      Text,
      { style: { fontSize: 28 } },
      "오늘 ",
      React.createElement(Text, { style: { color: "red" } }, "건강"),
    ),
  )
  expect(mockRendered.map((p) => p.maxFontSizeMultiplier)).toEqual([1.25, 1.25])
})
test("body and caption remain enlargeable, while input and explicit control limits stay compact", () => {
  renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, { style: { fontSize: 16 } }, "본문"),
      React.createElement(Text, { style: { fontSize: 12 } }, "안내"),
      React.createElement(TextInput, { style: { fontSize: 16 } }),
      React.createElement(
        Text,
        { maxFontSizeMultiplier: FONT_SCALE.control },
        "저장",
      ),
    ),
  )
  expect(mockRendered.map((p) => p.maxFontSizeMultiplier)).toEqual([
    1.5, 1.6, 1.3, 1.3,
  ])
})
test("specialized callers can preserve fixed glyphs and documented text scaling overrides", () => {
  renderToStaticMarkup(
    React.createElement(
      Text,
      { allowFontScaling: false, maxFontSizeMultiplier: 1 },
      "glyph",
    ),
  )
  expect(mockRendered[0]).toMatchObject({
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  })
})

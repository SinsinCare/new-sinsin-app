import React from "react"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { ReviewExpandableContent } from "../src/features/restaurant/components/detail/ReviewExpandableContent"
jest.mock("react", () => {
  const h = jest.requireActual("./helpers/effectHookHarness")
  return { ...jest.requireActual("react"), useState: h.useState }
})
jest.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  StyleSheet: { create: (x: unknown) => x },
  useWindowDimensions: () => ({ fontScale: 1 }),
}))
jest.mock("@/src/shared/components/AppText", () => ({ Text: "Text" }))
jest.mock("@/src/design-system-v2", () => ({
  spacing: { 4: 4, 8: 8 },
  typography: { subtext: { large: {}, medium: {} } },
  useV2Theme: () => ({ colors: { label: { assistive: "#888" } } }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
type Node = React.ReactElement<Record<string, any>>
function nodes(tree: unknown): Node[] {
  if (!React.isValidElement(tree)) return []
  const n = tree as Node
  return [n, ...React.Children.toArray(n.props.children).flatMap(nodes)]
}
function fixture() {
  let expanded = false
  let content = "A review"
  const expand = jest.fn(() => {
    expanded = true
    h.rerender()
  })
  const h = renderHookWithEffects(() =>
    ReviewExpandableContent({
      content,
      expanded,
      onExpand: expand,
      color: "#222",
    }),
  )
  return {
    ...h,
    expand,
    change: (v: string) => {
      content = v
      h.rerender()
    },
    layout: (w: number) => {
      ;(h.result() as Node).props.onLayout({
        nativeEvent: { layout: { width: w } },
      })
    },
    measure: (count: number) => {
      const n = nodes(h.result()).find((n) => n.props.onTextLayout)
      expect(n).toBeDefined()
      n!.props.onTextLayout({
        nativeEvent: {
          lines: Array.from({ length: count }, () => ({ text: "line" })),
        },
      })
    },
    buttons: () =>
      nodes(h.result()).filter((n) => n.props.accessibilityRole === "button"),
  }
}
it.each([1, 2, 3])("does not expose more for %s complete lines", (count) => {
  const h = fixture()
  h.layout(300)
  h.measure(count)
  expect(h.buttons()).toHaveLength(0)
  expect(nodes(h.result()).some((n) => n.props.onTextLayout)).toBe(false)
})
it("expands overflowing text and removes the clamp", () => {
  const h = fixture()
  h.layout(300)
  h.measure(4)
  expect(h.buttons()).toHaveLength(1)
  h.buttons()[0]!.props.onPress()
  expect(h.expand).toHaveBeenCalledTimes(1)
  expect(h.buttons()).toHaveLength(0)
  expect(
    nodes(h.result()).find((n) => n.props.children === "A review")?.props
      .numberOfLines,
  ).toBeUndefined()
})
it("remeasures on width and content changes without accepting stale measurements", () => {
  const h = fixture()
  h.layout(300)
  const old = nodes(h.result()).find((n) => n.props.onTextLayout)!
  h.measure(4)
  h.layout(500)
  expect(h.buttons()).toHaveLength(0)
  old.props.onTextLayout({ nativeEvent: { lines: [{}, {}, {}, {}] } })
  expect(h.buttons()).toHaveLength(0)
  h.measure(2)
  h.change("A different review")
  expect(h.buttons()).toHaveLength(0)
  h.measure(5)
  expect(h.buttons()).toHaveLength(1)
})
it("keeps the measuring copy outside layout and accessibility", () => {
  const h = fixture()
  h.layout(300)
  const hidden = nodes(h.result()).find(
    (n) => n.props.accessibilityElementsHidden,
  )!
  expect(hidden.props.importantForAccessibility).toBe("no-hide-descendants")
  expect(hidden.props.pointerEvents).toBe("none")
  expect(hidden.props.style.position).toBe("absolute")
})

import React from "react"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { MenuNutritionDisclosure } from "../src/features/restaurant/components/detail/MenuNutritionDisclosure"
import type { MenuItemDto } from "../src/features/restaurant/types"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.requireActual("./helpers/effectHookHarness").useState,
}))
jest.mock("react-native", () => ({
  Pressable: "Pressable",
  View: "View",
  StyleSheet: { create: (x: unknown) => x },
}))
jest.mock("react-native-reanimated", () => {
  const transition = {
    duration: () => transition,
    reduceMotion: () => transition,
  }
  return {
    __esModule: true,
    default: { View: "AnimatedView" },
    FadeIn: transition,
    LinearTransition: transition,
    ReduceMotion: { System: "system" },
  }
})
jest.mock("@/src/design-system-v2/primitives/NativeText", () => ({
  Text: "Text",
}))
jest.mock("@/src/design-system-v2", () => ({
  spacing: {},
  typography: { subtext: { medium: {}, small: {} } },
  iconSize: {},
  V2Icon: "Icon",
  useV2Theme: () => ({ colors: { label: {} } }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ko" } }),
}))
type Node = React.ReactElement<Record<string, any>>
function nodes(tree: unknown): Node[] {
  if (!React.isValidElement(tree)) return []
  const node = tree as Node
  return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)]
}
it("reveals nutrition on request and removes it when collapsed, preserving missing values", () => {
  const menu = {
    name: "테스트 메뉴",
    calories: 0,
    sodium: null,
    potassium: Number.NaN,
    phosphorus: -1,
    protein: 6.1,
    confidence: "ESTIMATED",
  } as MenuItemDto
  const h = renderHookWithEffects(() => MenuNutritionDisclosure({ menu }))
  const button = () =>
    nodes(h.result()).find((n) => n.props.accessibilityRole === "button")!
  const text = () =>
    nodes(h.result())
      .filter((n) => typeof n.props.children === "string")
      .map((n) => n.props.children)
  expect(button().props.accessibilityState.expanded).toBe(false)
  expect(text()).not.toContain("0 kcal")
  button().props.onPress()
  expect(button().props.accessibilityState.expanded).toBe(true)
  expect(text()).toContain("0 kcal")
  expect(text()).toContain("6.1 g")
  expect(
    text().filter((v) => v === "restaurant.detail.menuNutritionUnknown"),
  ).toHaveLength(3)
  expect(text()).not.toContain("0 mg")
  button().props.onPress()
  expect(text()).not.toContain("6.1 g")
  expect(button().props.accessibilityState.expanded).toBe(false)
  h.unmount()
})

import React from "react"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { PortionGuide } from "../src/features/nutrition/components/PortionGuide"

import { PersonalPortionCalculator } from "../src/features/nutrition/components/PersonalPortionCalculator"
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
  typography: { subtext: { medium: {}, small: {} }, label: { small: {} } },
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
it("reveals the calculation without hiding the portion, then collapses it", () => {
  const h = renderHookWithEffects(() =>
    PortionGuide({
      reference: { fraction: 0.5, driver: "sodium", mealFraction: 0.35 },
      menu: true,
    }),
  )
  const button = () =>
    nodes(h.result()).find((n) => n.props.accessibilityRole === "button")!
  const text = () => nodes(h.result()).map((n) => n.props.children)
  expect(button().props.accessibilityState.expanded).toBe(false)
  expect(text()).toContain("portionGuide.menuAmount")
  expect(text()).not.toContain("portionGuide.explanation")
  button().props.onPress()
  expect(button().props.accessibilityState.expanded).toBe(true)
  expect(text()).toContain("portionGuide.explanation")
  expect(text()).toContain("portionGuide.menuAmount")
  button().props.onPress()
  expect(text()).not.toContain("portionGuide.explanation")
  h.unmount()
})
it("does not expose a numeric portion or a dead disclosure when information is missing", () => {
  const h = renderHookWithEffects(() => PortionGuide({ reference: null }))
  expect(
    nodes(h.result()).some((n) => n.props.accessibilityRole === "button"),
  ).toBe(false)
  expect(nodes(h.result()).map((n) => n.props.children)).toContain(
    "portionGuide.unavailable",
  )
  h.unmount()
})
it("requires explicit confirmation and removes the computed quantity when confirmation is revoked", () => {
  const onConsult = jest.fn()
  const h = renderHookWithEffects(() =>
    PersonalPortionCalculator({
      onConsult,
      isRefreshing: true,
      menu: true,
      input: {
        targets: {
          sodium: 2000,
          potassium: 2000,
          phosphorus: 1000,
          protein: 60,
        },
        perServing: {
          sodium: 1000,
          potassium: 200,
          phosphorus: 100,
          protein: 10,
        },
        intake: {
          date: new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10),
          status: "none",
          values: null,
        },
      },
    }),
  )
  const text = () => nodes(h.result()).map((n) => n.props.children)
  const confirm = () =>
    nodes(h.result()).find((n) => n.props.accessibilityRole === "button")!
  expect(text()).not.toContain("portionGuide.personalMenu")
  confirm().props.onPress()
  expect(text()).toContain("portionGuide.personalMenu")
  const pending = nodes(h.result()).find(
    (n) =>
      n.props.accessibilityRole === "button" &&
      nodes(n).some(
        (child) => child.props.children === "portionGuide.refreshing",
      ),
  )!
  expect(pending.props.disabled).toBe(true)
  expect(pending.props.accessibilityState.disabled).toBe(true)
  expect(onConsult).not.toHaveBeenCalled()
  confirm().props.onPress()
  expect(text()).not.toContain("portionGuide.personalMenu")
  h.unmount()
})

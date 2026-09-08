/* eslint-disable import/first */
import { renderHookWithEffects } from "./helpers/effectHookHarness"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...require("./helpers/effectHookHarness"),
}))
jest.mock("react-native", () => ({
  Pressable: "Pressable",
  View: "View",
  StyleSheet: { create: (v: unknown) => v },
}))
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: "AnimatedView" },
  FadeIn: { duration: () => "fade" },
  useSharedValue: (value: number) =>
    require("./helpers/effectHookHarness").useRef({ value }).current,
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (value: unknown) => value,
  Easing: { out: (v: unknown) => v, cubic: "cubic" },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/features/consultation/hooks/useConsultMotion", () => ({
  useConsultMotion: () => true,
}))
jest.mock("../src/features/consultation/components/ConsultCompanion", () => ({
  ConsultCompanion: "Companion",
}))
jest.mock("../src/features/consultation/components/ConsultShimmerText", () => ({
  ConsultShimmerText: "Shimmer",
}))
jest.mock("@/src/design-system-v2", () => ({
  V2Text: "Text",
  V2Icon: "Icon",
  spacing: {},
  useV2Theme: () => ({
    colors: { label: { normal: "#222", neutral: "#666" } },
  }),
}))
import {
  useStableConsultStatus,
  useConsultResultReveal,
} from "../src/features/consultation/hooks/useConsultPresentation"
import { ConsultActivityTrail } from "../src/features/consultation/components/ConsultActivityTrail"
import { ConsultDisclosure } from "../src/features/consultation/components/ConsultDisclosure"
import type { ConsultActivity } from "../src/types/chat"
beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test("100ms tool pulses never flash, latest state wins, and shown states have readable dwell", () => {
  let key = "waiting",
    active = true
  const h = renderHookWithEffects(() => useStableConsultStatus(key, active))
  jest.advanceTimersByTime(1000)
  key = "profile"
  h.rerender()
  jest.advanceTimersByTime(100)
  expect(h.result()).toBe("waiting")
  key = "answer"
  h.rerender()
  jest.advanceTimersByTime(240)
  expect(h.result()).toBe("answer")
  key = "recipe"
  h.rerender()
  jest.advanceTimersByTime(400)
  expect(h.result()).toBe("answer")
  jest.advanceTimersByTime(240)
  expect(h.result()).toBe("recipe")
  key = "finished"
  active = false
  h.rerender()
  expect(h.result()).toBe("finished")
  jest.runAllTimers()
  expect(h.result()).toBe("finished")
  h.unmount()
})
test("unmount drops a pending phase and never renders a stale label", () => {
  let key = "waiting"
  const h = renderHookWithEffects(() => useStableConsultStatus(key, true))
  key = "profile"
  h.rerender()
  h.unmount()
  const count = h.renderCount()
  jest.runAllTimers()
  expect(h.renderCount()).toBe(count)
})
test("result receipts wait for completed prose, history is immediate, retry and failure cancel handoffs", () => {
  let streaming = true,
    failed = false
  const h = renderHookWithEffects(() =>
    useConsultResultReveal(streaming, failed),
  )
  jest.advanceTimersByTime(10000)
  expect(h.result().ready).toBe(false)
  streaming = false
  h.rerender()
  jest.advanceTimersByTime(119)
  expect(h.result().ready).toBe(false)
  streaming = true
  h.rerender()
  jest.advanceTimersByTime(10)
  expect(h.result().ready).toBe(false)
  streaming = false
  h.rerender()
  failed = true
  h.rerender()
  jest.runAllTimers()
  expect(h.result().ready).toBe(false)
  failed = false
  h.rerender()
  jest.advanceTimersByTime(120)
  expect(h.result()).toEqual({ ready: true, animate: true })
  h.unmount()
  const history = renderHookWithEffects(() =>
    useConsultResultReveal(false, false),
  )
  expect(history.result()).toEqual({ ready: true, animate: false })
  history.unmount()
})
test("first actual tool does not replace the heading host or shimmer subtree", () => {
  let activities: ConsultActivity[] = []
  const h = renderHookWithEffects(() =>
    ConsultActivityTrail({ activities, active: true }),
  )
  const heading = () => h.result().props.children[0]
  expect(heading().type).toBe("Pressable")
  expect(heading().props.disabled).toBe(true)
  activities = [{ id: "p", action: "profile", status: "running" }]
  h.rerender()
  expect(heading().type).toBe("Pressable")
  expect(heading().props.disabled).toBe(false)
  expect(heading().props.children.type).toBe(Symbol.for("react.fragment"))
  h.unmount()
})
test("disclosure measures content, retains it while collapsing, hides accessibility immediately, and reverses", () => {
  let open = false
  const h = renderHookWithEffects(() =>
    ConsultDisclosure({ open, children: "exact amount 60g" }),
  )
  expect(h.result().props.children).toBe(false)
  open = true
  h.rerender()
  h.result().props.children.props.onLayout({
    nativeEvent: { layout: { height: 312 } },
  })
  expect(h.result().props.style[1].height).toBe(312)
  open = false
  h.rerender()
  expect(h.result().props.style[1].height).toBe(0)
  expect(h.result().props.accessibilityElementsHidden).toBe(true)
  expect(h.result().props.pointerEvents).toBe("none")
  expect(h.result().props.children.props.children).toBe("exact amount 60g")
  open = true
  h.rerender()
  expect(h.result().props.style[1].height).toBe(312)
  expect(h.result().props.accessibilityElementsHidden).toBe(false)
  h.unmount()
})

test("the result handoff pauses following before it can change transcript height", () => {
  let streaming = true
  const beforeReveal = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultResultReveal(streaming, false, beforeReveal),
  )
  streaming = false
  h.rerender()
  expect(beforeReveal).not.toHaveBeenCalled()
  jest.advanceTimersByTime(120)
  expect(beforeReveal).toHaveBeenCalledTimes(1)
  expect(h.result().ready).toBe(true)
  h.unmount()
})

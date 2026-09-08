/* eslint-disable import/first */
import { renderHookWithEffects } from "./helpers/effectHookHarness"
const mockApp = { currentState: "active" }
let mockFocused = true
let mockReduced = false
let mockAppListener: (state: string) => void
let mockMotionListener: (value: boolean) => void
const mockRemoveApp = jest.fn()
const mockRemoveMotion = jest.fn()
const mockMotionQuery = jest.fn()
const mockRepeat = jest.fn((..._args: unknown[]) => "animation")
const mockCancel = jest.fn()
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...require("./helpers/effectHookHarness"),
}))
jest.mock("react-native", () => ({
  AppState: {
    get currentState() {
      return mockApp.currentState
    },
    addEventListener: (_: string, callback: typeof mockAppListener) => {
      mockAppListener = callback
      return { remove: mockRemoveApp }
    },
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => mockMotionQuery(),
    addEventListener: (_: string, callback: typeof mockMotionListener) => {
      mockMotionListener = callback
      return { remove: mockRemoveMotion }
    },
  },
}))
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockFocused,
}))
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { Text: "AnimatedText" },
  useReducedMotion: () => mockReduced,
  useSharedValue: (value: number) =>
    require("./helpers/effectHookHarness").useRef({ value }).current,
  cancelAnimation: (...args: unknown[]) => mockCancel(...args),
  Easing: { linear: "linear" },
  withTiming: (value: unknown) => value,
  withSequence: (...values: unknown[]) => values,
  withDelay: (_: number, value: unknown) => value,
  withRepeat: (...args: unknown[]) => mockRepeat(...args),
}))
jest.mock("@/src/design-system-v2", () => ({
  V2Text: "Text",
  useV2Theme: () => ({
    colors: { label: { neutral: "#737373", normal: "#242424" } },
  }),
}))
import { useConsultMotion } from "../src/features/consultation/hooks/useConsultMotion"
import { ConsultShimmerText } from "../src/features/consultation/components/ConsultShimmerText"
const animation = (readLabel: () => string = () => "질문을 살펴보고 있어요") =>
  renderHookWithEffects(() => {
    const element = ConsultShimmerText({ label: readLabel(), active: true })
    return (element.type as (props: unknown) => unknown)(element.props)
  })
beforeEach(() => {
  jest.clearAllMocks()
  mockApp.currentState = "active"
  mockFocused = true
  mockReduced = false
  mockMotionQuery.mockResolvedValue(false)
})
test("completed labels have no animation component", () => {
  expect(
    ConsultShimmerText({ label: "확인한 정보 1개", active: false }).type,
  ).toBe("Text")
  expect(mockRepeat).not.toHaveBeenCalled()
})
test("background and screen blur cancel the running sweep", () => {
  const hook = animation()
  expect(mockRepeat).toHaveBeenCalledTimes(1)
  mockApp.currentState = "background"
  mockAppListener("background")
  expect(mockCancel).toHaveBeenCalled()
  expect((hook.result() as any).props.children).toBe("질문을 살펴보고 있어요")
  mockApp.currentState = "active"
  mockAppListener("active")
  expect(mockRepeat).toHaveBeenCalledTimes(2)
  mockFocused = false
  hook.rerender()
  expect((hook.result() as any).props.children).toBe("질문을 살펴보고 있어요")
  hook.unmount()
})
test("reduce-motion changes stop animation immediately and preserve readable text", () => {
  const hook = animation()
  mockMotionListener(true)
  expect((hook.result() as any).props.children).toBe("질문을 살펴보고 있어요")
  expect(mockCancel).toHaveBeenCalled()
  mockMotionListener(false)
  expect(mockRepeat).toHaveBeenCalledTimes(2)
  hook.unmount()
})
test("an initially reduced-motion device starts with static text", () => {
  mockReduced = true
  const hook = animation()
  expect(mockRepeat).not.toHaveBeenCalled()
  expect((hook.result() as any).props.children).toBe("질문을 살펴보고 있어요")
  hook.unmount()
})
test("phase label changes do not restart the sweep or reserve a new layout", () => {
  let label = "질문을 살펴보고 있어요"
  const hook = animation(() => label)
  label = "레시피를 찾고 있어요"
  hook.rerender()
  expect(mockRepeat).toHaveBeenCalledTimes(1)
  expect((hook.result() as any).props.token).toBe("subtext.medium")
  expect((hook.result() as any).props.accessibilityLabel).toBe(label)
  hook.unmount()
})
test("late preference lookup cannot override a newer OS preference event", async () => {
  let resolve!: (value: boolean) => void
  mockMotionQuery.mockReturnValue(
    new Promise<boolean>((yes) => {
      resolve = yes
    }),
  )
  const hook = renderHookWithEffects(() => useConsultMotion(true))
  mockMotionListener(true)
  resolve(false)
  await Promise.resolve()
  expect(hook.result()).toBe(false)
  hook.unmount()
})
test("unmount cancels animation and removes both subscriptions; late lookup does nothing", async () => {
  let resolve!: (value: boolean) => void
  mockMotionQuery.mockReturnValue(
    new Promise<boolean>((yes) => {
      resolve = yes
    }),
  )
  const hook = animation()
  hook.unmount()
  const count = hook.renderCount()
  resolve(true)
  await Promise.resolve()
  expect(hook.renderCount()).toBe(count)
  expect(mockCancel).toHaveBeenCalled()
  expect(mockRemoveApp).toHaveBeenCalledTimes(1)
  expect(mockRemoveMotion).toHaveBeenCalledTimes(1)
})

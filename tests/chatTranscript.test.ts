import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useChatTranscript } from "../src/features/consultation/hooks/useChatTranscript"
jest.mock("react", () => require("./helpers/effectHookHarness"))

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())
test("bursts reveal only whole approved chunks, never half a number or Korean negation", () => {
  let content = ""
  const h = renderHookWithEffects(() => useChatTranscript(content, true))
  content = "나트륨은 1,200mg이에요."
  h.rerender()
  jest.advanceTimersByTime(40)
  expect(h.result()).toBe("")
  content += " 임의로 약을 줄여도 괜찮지 않아요."
  h.rerender()
  jest.advanceTimersByTime(40)
  expect(h.result()).toBe(content)
  h.unmount()
})
test("completion and replacement errors flush immediately and clear pending updates", () => {
  let content = "첫 문장."
  let streaming = true
  const h = renderHookWithEffects(() => useChatTranscript(content, streaming))
  content += " 두 번째 문장."
  h.rerender()
  streaming = false
  h.rerender()
  expect(h.result()).toBe(content)
  content = "답변을 받지 못했어요."
  h.rerender()
  jest.runAllTimers()
  expect(h.result()).toBe(content)
  h.unmount()
})

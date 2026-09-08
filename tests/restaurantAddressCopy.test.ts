import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useAddressCopy } from "../src/features/restaurant/hooks/useAddressCopy"
import * as Clipboard from "expo-clipboard"
jest.mock("react", () => {
  const h = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...jest.requireActual("react"),
    useState: h.useState,
    useCallback: h.useCallback,
    useEffect: h.useEffect,
    useRef: h.useRef,
  }
})
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }))
const write = jest.mocked(Clipboard.setStringAsync)
function mount(value = "Test address") {
  const success = jest.fn(),
    failure = jest.fn()
  return {
    ...renderHookWithEffects(() => useAddressCopy(value, success, failure)),
    success,
    failure,
  }
}
beforeEach(() => {
  jest.useFakeTimers()
  write.mockReset()
})
afterEach(() => jest.useRealTimers())
it.each(["Test address", "02-0000-0000"])(
  "waits for confirmed copy and locks repeated taps (%s)",
  async (value) => {
    let resolve!: (v: boolean) => void
    write.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      }),
    )
    const h = mount(value)
    const pending = h.result().copy()
    await h.result().copy()
    expect(write).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledWith(value)
    expect(h.success).not.toHaveBeenCalled()
    expect(h.result().justCopied).toBe(false)
    resolve(true)
    await pending
    expect(h.success).toHaveBeenCalledTimes(1)
    expect(h.result().justCopied).toBe(true)
    jest.advanceTimersByTime(1600)
    expect(h.result().justCopied).toBe(false)
    h.unmount()
  },
)
it.each([false, true])(
  "reports failure and permits retry (reject=%s)",
  async (reject) => {
    if (reject) write.mockRejectedValueOnce(new Error("clipboard unavailable"))
    else write.mockResolvedValueOnce(false)
    const h = mount()
    await h.result().copy()
    expect(h.failure).toHaveBeenCalledTimes(1)
    expect(h.success).not.toHaveBeenCalled()
    expect(h.result().justCopied).toBe(false)
    write.mockResolvedValueOnce(true)
    await h.result().copy()
    expect(h.success).toHaveBeenCalledTimes(1)
    h.unmount()
  },
)
it("ignores a late completion after leaving", async () => {
  let resolve!: (v: boolean) => void
  write.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r
    }),
  )
  const h = mount()
  const pending = h.result().copy()
  h.unmount()
  resolve(true)
  await pending
  expect(h.success).not.toHaveBeenCalled()
  expect(h.failure).not.toHaveBeenCalled()
  expect(jest.getTimerCount()).toBe(0)
})

import { Platform, Share } from "react-native"
import { shareContent } from "../src/shared/utils/share"
import { afterModalTransitions } from "../src/shared/components/appModalGate"
import { showErrorToast } from "../src/lib/toast"
import { hapticSelection } from "../src/lib/haptics"
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Share: { share: jest.fn() },
}))
jest.mock("@/src/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
jest.mock("@/src/lib/toast", () => ({ showErrorToast: jest.fn() }))
jest.mock("@/src/shared/components/appModalGate", () => ({
  afterModalTransitions: jest.fn(),
}))
const share = jest.mocked(Share.share)
const transitions = jest.mocked(afterModalTransitions)
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const input = {
  body: "Example restaurant",
  link: "sinsin:///restaurant/1",
  scope: "restaurant-detail",
}
beforeEach(() => {
  jest.clearAllMocks()
  transitions.mockReset().mockResolvedValue(undefined)
  share.mockReset().mockResolvedValue({ action: "dismissedAction" })
  Platform.OS = "ios"
})
it("coalesces taps before transition completion and while native sharing is open", async () => {
  const wait = deferred<void>()
  const native = deferred<Awaited<ReturnType<typeof Share.share>>>()
  transitions.mockReturnValueOnce(wait.promise)
  share.mockReturnValueOnce(native.promise)
  const first = shareContent(input)
  const second = shareContent(input)
  expect(second).toBe(first)
  await Promise.resolve()
  expect(share).not.toHaveBeenCalled()
  wait.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(share).toHaveBeenCalledTimes(1)
  expect(shareContent({ ...input, scope: "post-detail" })).toBe(first)
  expect(hapticSelection).toHaveBeenCalledTimes(1)
  native.resolve({ action: "dismissedAction" })
  await first
  expect(showErrorToast).not.toHaveBeenCalled()
  await shareContent(input)
  expect(share).toHaveBeenCalledTimes(2)
})
it("reports native failure without exposing the native payload and permits retry", async () => {
  share.mockRejectedValueOnce(new Error("private text and URL"))
  await expect(shareContent(input)).resolves.toBeUndefined()
  expect(showErrorToast).toHaveBeenCalledWith(
    "shareUi.errorTitle",
    "shareUi.errorBody",
  )
  await shareContent(input)
  expect(share).toHaveBeenCalledTimes(2)
})
it("handles transition failures inside the same error boundary", async () => {
  transitions.mockRejectedValueOnce(new Error("transition failed"))
  await expect(shareContent(input)).resolves.toBeUndefined()
  expect(share).not.toHaveBeenCalled()
  expect(showErrorToast).toHaveBeenCalledTimes(1)
  await shareContent(input)
  expect(share).toHaveBeenCalledTimes(1)
})
it.each(["ios", "android"] as const)(
  "retains the %s content and link contract",
  async (os) => {
    Platform.OS = os
    await shareContent(input)
    expect(share).toHaveBeenCalledWith(
      os === "ios"
        ? { message: input.body, url: input.link }
        : { message: `${input.body}\n${input.link}` },
    )
    expect(showErrorToast).not.toHaveBeenCalled()
  },
)

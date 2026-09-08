import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useSubscriptionScreen } from "../src/features/billing/hooks/useSubscriptionScreen"
const mockRestore = jest.fn()
const mockSync = jest.fn()
const mockManage = jest.fn()
const mockOpen = jest.fn()
const mockRefresh = jest.fn()
const mockTrack = jest.fn()
let mockUserId = "test-account"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) =>
    jest.requireActual("./helpers/effectHookHarness").useEffect(cb, [cb]),
}))
jest.mock("react-native", () => ({
  Linking: { openURL: (...args: unknown[]) => mockOpen(...args) },
}))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => mockTrack(...args),
}))
jest.mock("../src/features/billing/BillingProvider", () => ({
  useBilling: () => ({
    status: { plan: "free", appUserId: mockUserId },
    refresh: mockRefresh,
    syncNow: mockSync,
  }),
}))
jest.mock("../src/features/billing/purchases/purchasesClient", () => ({
  restore: () => mockRestore(),
  managementUrl: () => mockManage(),
}))
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const mount = () => renderHookWithEffects(useSubscriptionScreen)
beforeEach(() => {
  jest.clearAllMocks()
  mockUserId = "test-account"
  mockRefresh.mockResolvedValue(undefined)
  mockRestore.mockResolvedValue({ status: "purchased" })
  mockSync.mockResolvedValue({ plan: "premium" })
  mockManage.mockResolvedValue("https://apps.apple.com/account/subscriptions")
  mockOpen.mockResolvedValue(undefined)
})
test("manage and restore share a synchronous double-tap lock", async () => {
  const pending = deferred<{ status: string }>()
  mockRestore.mockReturnValueOnce(pending.promise)
  const h = mount()
  const snapshot = h.result()
  const first = snapshot.onRestore()
  void snapshot.onRestore()
  void snapshot.onManage()
  expect(mockRestore).toHaveBeenCalledTimes(1)
  expect(mockManage).not.toHaveBeenCalled()
  pending.resolve({ status: "purchased" })
  await first
  expect(h.result().busy).toBeNull()
  expect(h.result().notice?.key).toBe("subscription.restoreDone")
  expect(mockRefresh).toHaveBeenCalledTimes(1)
  h.unmount()
})
test.each(["premium", "care_plus", "free"])(
  "restore uses newly synchronized %s entitlement",
  async (plan) => {
    mockSync.mockResolvedValueOnce({ plan })
    const h = mount()
    await h.result().onRestore()
    expect(h.result().notice).toEqual({
      key:
        plan === "free"
          ? "subscription.restoreEmpty"
          : "subscription.restoreDone",
      error: false,
    })
    h.unmount()
  },
)
test.each(["sdk", "sync", "missing"])(
  "%s failure is not reported as an empty purchase history",
  async (failure) => {
    if (failure === "sdk")
      mockRestore.mockResolvedValueOnce({ status: "failed" })
    if (failure === "sync") mockSync.mockRejectedValueOnce(new Error("offline"))
    if (failure === "missing") mockSync.mockResolvedValueOnce(null)
    const h = mount()
    await h.result().onRestore()
    expect(h.result().notice).toEqual({
      key: "subscription.restoreError",
      error: true,
    })
    expect(h.result().busy).toBeNull()
    expect(mockTrack).not.toHaveBeenCalled()
    h.unmount()
  },
)
test("cancel leaves no notice and a failed store link can be retried", async () => {
  mockRestore.mockResolvedValueOnce({ status: "cancelled" })
  const h = mount()
  await h.result().onRestore()
  expect(h.result().notice).toBeNull()
  expect(mockSync).not.toHaveBeenCalled()
  mockOpen.mockRejectedValueOnce(new Error("store unavailable"))
  await h.result().onManage()
  expect(h.result().notice?.key).toBe("subscription.manageError")
  await h.result().onManage()
  expect(mockManage).toHaveBeenCalledTimes(2)
  expect(h.result().notice).toBeNull()
  expect(h.result().busy).toBeNull()
  h.unmount()
})
test("late restore cannot publish a notice for a different account or after exit", async () => {
  const first = deferred<{ status: string }>()
  mockRestore.mockReturnValueOnce(first.promise)
  const h = mount()
  const run = h.result().onRestore()
  mockUserId = "another-account"
  h.rerender()
  first.resolve({ status: "purchased" })
  await run
  expect(mockSync).not.toHaveBeenCalled()
  expect(h.result().notice).toBeNull()
  const second = deferred<{ status: string }>()
  mockRestore.mockReturnValueOnce(second.promise)
  const exiting = h.result().onRestore()
  h.unmount()
  const count = h.renderCount()
  second.resolve({ status: "purchased" })
  await exiting
  expect(h.renderCount()).toBe(count)
  expect(mockTrack).not.toHaveBeenCalled()
})

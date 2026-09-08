import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { usePaywallController } from "../src/features/billing/hooks/usePaywallController"
import type { PaywallRequest } from "../src/features/billing/paywallHost"
import type { OfferingPackage } from "../src/features/billing/purchases/purchasesClient"
import { showErrorToast, showInfoToast } from "../src/lib/toast"
const mockLoad = jest.fn()
const mockPurchase = jest.fn()
const mockRestore = jest.fn()
const mockSync = jest.fn()
const mockTrack = jest.fn()
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => mockTrack(...args),
  toDurationBucket: () => "short",
}))
jest.mock("../src/lib/toast", () => ({
  showErrorToast: jest.fn(),
  showInfoToast: jest.fn(),
}))
jest.mock("../src/features/billing/BillingProvider", () => ({
  useBilling: () => ({ status: { plan: "free" }, syncNow: mockSync }),
}))
jest.mock("../src/features/billing/purchases/purchasesClient", () => ({
  loadCurrentOffering: (...args: unknown[]) => mockLoad(...args),
  purchase: (...args: unknown[]) => mockPurchase(...args),
  restore: (...args: unknown[]) => mockRestore(...args),
}))
const monthly = {
  id: "monthly",
  lookupKey: "$rc_monthly",
  price: 9.99,
} as OfferingPackage
const annual = {
  id: "annual",
  lookupKey: "$rc_annual",
  price: 79.99,
} as OfferingPackage
const offering = { packages: [monthly, annual] }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
const close = jest.fn()
let request: PaywallRequest | null
function mount() {
  return renderHookWithEffects(() => usePaywallController(request, close))
}
beforeEach(() => {
  jest.clearAllMocks()
  request = { entry: "settings_subscription" }
  mockLoad.mockResolvedValue(offering)
  mockPurchase.mockResolvedValue({ status: "cancelled" })
  mockRestore.mockResolvedValue({ status: "purchased" })
  mockSync.mockResolvedValue({ plan: "premium" })
})
test("selection follows annual availability and the selected product is purchased", async () => {
  const h = mount()
  expect(h.result().loading).toBe(true)
  await h.result().onBuy()
  expect(mockPurchase).not.toHaveBeenCalled()
  await flush()
  expect(h.result().chosen).toBe(annual)
  h.result().setSelected(monthly.lookupKey)
  await h.result().onBuy()
  expect(mockPurchase).toHaveBeenCalledWith(monthly)
  expect(close).not.toHaveBeenCalled()
  expect(showErrorToast).not.toHaveBeenCalled()
  h.unmount()
})
test("a monthly-only offering is selected and unavailable reloads clear stale prices", async () => {
  mockLoad.mockResolvedValueOnce({ packages: [monthly] })
  const h = mount()
  await flush()
  expect(h.result().chosen).toBe(monthly)
  mockLoad.mockRejectedValueOnce(new Error("offline"))
  h.result().retry()
  expect(h.result().packages).toEqual([])
  await flush()
  expect(h.result().loading).toBe(false)
  expect(h.result().chosen).toBeNull()
  expect(
    mockTrack.mock.calls.filter((call) => call[0] === "paywall_shown"),
  ).toHaveLength(1)
  h.unmount()
})
test("late offering responses cannot overwrite the reopened paywall", async () => {
  const first = deferred<typeof offering>()
  mockLoad.mockReturnValueOnce(first.promise)
  const h = mount()
  request = null
  h.rerender()
  request = { entry: "settings_subscription" }
  mockLoad.mockResolvedValueOnce({ packages: [monthly] })
  h.rerender()
  await flush()
  first.resolve(offering)
  await flush()
  expect(h.result().chosen).toBe(monthly)
  h.unmount()
})
test("double taps and simultaneous restore share one synchronous operation lock", async () => {
  const purchase = deferred<{ status: string }>()
  mockPurchase.mockReturnValueOnce(purchase.promise)
  const h = mount()
  await flush()
  const snapshot = h.result()
  const first = snapshot.onBuy()
  void snapshot.onBuy()
  void snapshot.onRestore()
  expect(mockPurchase).toHaveBeenCalledTimes(1)
  expect(mockRestore).not.toHaveBeenCalled()
  purchase.resolve({ status: "cancelled" })
  await first
  expect(h.result().busy).toBe(false)
  expect(close).not.toHaveBeenCalled()
  h.unmount()
})
test("purchase waits for server sync and cannot close a newer paywall", async () => {
  const sync = deferred<{ plan: string }>()
  mockSync.mockReturnValueOnce(sync.promise)
  mockPurchase.mockResolvedValueOnce({ status: "purchased" })
  const h = mount()
  await flush()
  const buy = h.result().onBuy()
  await flush()
  expect(close).not.toHaveBeenCalled()
  expect(h.result().busy).toBe(true)
  request = null
  h.rerender()
  request = { entry: "settings_subscription" }
  h.rerender()
  sync.resolve({ plan: "premium" })
  await buy
  expect(close).not.toHaveBeenCalled()
  expect(h.result().busy).toBe(false)
  h.unmount()
})
test("restoration uses synchronized entitlement and duplicate restore is suppressed", async () => {
  const pending = deferred<{ status: string }>()
  mockRestore.mockReturnValueOnce(pending.promise)
  const h = mount()
  await flush()
  const snapshot = h.result()
  const first = snapshot.onRestore()
  void snapshot.onRestore()
  expect(mockRestore).toHaveBeenCalledTimes(1)
  pending.resolve({ status: "purchased" })
  await first
  expect(showInfoToast).toHaveBeenCalledWith("subscription.restoreDone")
  expect(close).toHaveBeenCalledTimes(1)
  h.unmount()
})
test("unexpected SDK rejection releases the lock and leaves the paywall available", async () => {
  mockPurchase.mockRejectedValueOnce(new Error("store"))
  const h = mount()
  await flush()
  await h.result().onBuy()
  expect(h.result().busy).toBe(false)
  expect(showErrorToast).toHaveBeenCalledTimes(1)
  await h.result().onBuy()
  expect(mockPurchase).toHaveBeenCalledTimes(2)
  h.unmount()
})

test("restore errors do not claim that the user has no purchases", async () => {
  mockRestore.mockRejectedValueOnce(new Error("offline"))
  const h = mount()
  await flush()
  await h.result().onRestore()
  expect(showInfoToast).not.toHaveBeenCalled()
  expect(showErrorToast).toHaveBeenCalledWith("subscription.restoreError")
  expect(h.result().busy).toBe(false)
  expect(close).not.toHaveBeenCalled()
  h.unmount()
})

import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useAccountDailyPrice } from "../src/features/billing/hooks/useAccountDailyPrice"
import type { BillingStatus } from "../src/features/billing/types"
import type { OfferingPackage } from "../src/features/billing/purchases/purchasesClient"
const mockLoad = jest.fn()
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => (() => void) | undefined) =>
    jest
      .requireActual("./helpers/effectHookHarness")
      .useEffect(callback, [callback]),
}))
jest.mock("../src/features/billing/purchases/purchasesClient", () => ({
  loadCurrentOffering: () => mockLoad(),
}))
const annual = {
  id: "annual",
  lookupKey: "$rc_annual",
  price: 79.99,
  priceString: "$79.99",
} as OfferingPackage
const offering = { packages: [annual] }
let status: Pick<BillingStatus, "plan" | "appUserId"> | null
async function flush() {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}
beforeEach(() => {
  jest.clearAllMocks()
  status = { plan: "free", appUserId: "account-a" }
  mockLoad.mockResolvedValue(offering)
})
test("a free account receives a calculated quote and paid accounts never see an upsell price", async () => {
  const h = renderHookWithEffects(() => useAccountDailyPrice(status))
  expect(h.result()).toBeNull()
  await flush()
  expect(h.result()?.text).toBe("$0.22")
  status = { plan: "premium", appUserId: "account-a" }
  h.rerender()
  expect(h.result()).toBeNull()
  expect(mockLoad).toHaveBeenCalledTimes(1)
  h.unmount()
})
test("unknown and paid plans do not request store offerings", async () => {
  status = null
  const h = renderHookWithEffects(() => useAccountDailyPrice(status))
  status = { plan: "care_plus", appUserId: "account-a" }
  h.rerender()
  await flush()
  expect(h.result()).toBeNull()
  expect(mockLoad).not.toHaveBeenCalled()
  h.unmount()
})
test("late response cannot leak the previous account's price", async () => {
  let finish!: (value: typeof offering) => void
  mockLoad.mockReturnValueOnce(
    new Promise((r) => {
      finish = r
    }),
  )
  const h = renderHookWithEffects(() => useAccountDailyPrice(status))
  status = { plan: "free", appUserId: "account-b" }
  mockLoad.mockResolvedValueOnce(null)
  h.rerender()
  await flush()
  finish(offering)
  await flush()
  expect(h.result()).toBeNull()
  h.unmount()
})
test("offering failure leaves an unknown price instead of inventing zero", async () => {
  mockLoad.mockRejectedValueOnce(new Error("offline"))
  const h = renderHookWithEffects(() => useAccountDailyPrice(status))
  await flush()
  expect(h.result()).toBeNull()
  h.unmount()
})

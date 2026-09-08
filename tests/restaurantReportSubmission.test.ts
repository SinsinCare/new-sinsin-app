import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useRestaurantReportSubmission } from "../src/features/restaurant/hooks/useRestaurantReportSubmission"
import { restaurantReportService } from "../src/services/data/restaurantReportService"
jest.mock("react", () => {
  const h = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...jest.requireActual("react"),
    useState: h.useState,
    useRef: h.useRef,
    useEffect: h.useEffect,
    useCallback: h.useCallback,
  }
})
jest.mock("@/src/services/data/restaurantReportService", () => ({
  restaurantReportService: { submitReport: jest.fn() },
}))
const request = jest.mocked(restaurantReportService.submitReport)
const input = {
  draft: {
    name: "Test",
    address: "",
    category: "KOREAN",
    recommendedMenu: "",
    reason: "",
  },
  photos: [],
}
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount() {
  const success = jest.fn(),
    error = jest.fn(),
    busy = jest.fn()
  const hook = renderHookWithEffects(() =>
    useRestaurantReportSubmission({
      onSuccess: success,
      onError: error,
      onSubmittingChange: busy,
    }),
  )
  return { ...hook, success, error, busy }
}
beforeEach(() => request.mockReset())
it("locks duplicate calls across pending upload and report, then blocks stale success resubmission", async () => {
  const p = deferred()
  request.mockReturnValueOnce(p.promise)
  const h = mount()
  const submit = h.result().submit
  const first = submit(input)
  await submit(input)
  expect(request).toHaveBeenCalledTimes(1)
  expect(h.result().isSubmitting).toBe(true)
  expect(h.busy).toHaveBeenCalledWith(true)
  p.resolve()
  await first
  await submit(input)
  expect(request).toHaveBeenCalledTimes(1)
  expect(h.success).toHaveBeenCalledTimes(1)
  expect(h.result().isSubmitting).toBe(false)
  request.mockResolvedValueOnce(undefined)
  await h
    .result()
    .submit({ ...input, draft: { ...input.draft, name: "Another" } })
  expect(request).toHaveBeenCalledTimes(2)
  h.unmount()
})
it("unlocks a failure for retry without clearing the form", async () => {
  request
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined)
  const h = mount()
  await h.result().submit(input)
  expect(h.success).not.toHaveBeenCalled()
  expect(h.error).toHaveBeenCalledTimes(1)
  expect(h.result().isSubmitting).toBe(false)
  await h.result().submit(input)
  expect(h.success).toHaveBeenCalledTimes(1)
  expect(h.busy.mock.calls.map((c) => c[0])).toEqual([true, false, true, false])
  h.unmount()
})
it.each([false, true])(
  "ignores completion after unmount (failure=%s)",
  async (fail) => {
    const p = deferred()
    request.mockReturnValueOnce(p.promise)
    const h = mount()
    const first = h.result().submit(input)
    const renders = h.renderCount()
    h.unmount()
    if (fail) p.reject(new Error("late"))
    else p.resolve()
    await first
    expect(h.success).not.toHaveBeenCalled()
    expect(h.error).not.toHaveBeenCalled()
    expect(h.renderCount()).toBe(renders)
    expect(h.busy.mock.calls.map((c) => c[0])).toEqual([true])
  },
)

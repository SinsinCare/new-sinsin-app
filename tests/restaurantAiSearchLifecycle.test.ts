import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useAiSearch } from "../src/features/restaurant/hooks/useAiSearch"
import type { AiSearchResult } from "../src/features/restaurant/types"
import { restaurantService } from "../src/services/data/restaurantService"

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useCallback: harness.useCallback,
  }
})
jest.mock("@/src/services/data/restaurantService", () => ({
  restaurantService: { aiSearch: jest.fn() },
}))

const request = jest.mocked(restaurantService.aiSearch)
const result: AiSearchResult = {
  filters: {
    cuisineTypes: ["KOREAN"],
    nutritionTags: [],
    regionGroups: ["seoul-seocho"],
    sort: "RECOMMENDED",
    openNow: false,
    maxPrice: null,
    q: null,
  },
  rationale: "서초 한식 조건",
  unmatchedTerms: [],
  fallback: false,
}
function deferred() {
  let resolve!: (value: AiSearchResult) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<AiSearchResult>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount(initial = "서초 한식") {
  let query = initial
  let enabled = true
  const hook = renderHookWithEffects(() => useAiSearch({ query, enabled }))
  return {
    ...hook,
    edit: (next: string) => {
      query = next
      hook.rerender()
    },
    visible: (next: boolean) => {
      enabled = next
      hook.rerender()
    },
  }
}
beforeEach(() => request.mockReset())

describe("AI proposals stay bound to their visible input", () => {
  it("editing hides a completed proposal before it can be applied", async () => {
    request.mockResolvedValue(result)
    const hook = mount()
    await hook.result().search()
    expect(hook.result().result).toBe(result)
    hook.edit("강남 중식")
    expect(hook.result().result).toBeNull()
    expect(hook.result().isPending).toBe(false)
    hook.unmount()
  })
  it("ignores an aborted old success after a newer request completes", async () => {
    const old = deferred()
    const next = deferred()
    request.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
    const hook = mount()
    const first = hook.result().search()
    const signal = request.mock.calls[0][1]!
    hook.edit("강남 중식")
    expect(signal.aborted).toBe(true)
    const second = hook.result().search()
    const current = { ...result, rationale: "강남 중식 조건" }
    next.resolve(current)
    await second
    old.resolve(result)
    await first
    expect(hook.result().result).toBe(current)
    expect(request.mock.calls[1][0].query).toBe("강남 중식")
    hook.unmount()
  })
  it("close/reopen rejects a late failure and starts with no pending state", async () => {
    const old = deferred()
    request.mockReturnValueOnce(old.promise)
    const hook = mount()
    const first = hook.result().search()
    hook.visible(false)
    hook.visible(true)
    old.reject(new Error("late network failure"))
    await first
    expect(hook.result()).toMatchObject({
      result: null,
      isPending: false,
      isError: false,
    })
    hook.unmount()
  })
  it("a failed replacement request cannot leave the previous apply result active", async () => {
    request
      .mockResolvedValueOnce(result)
      .mockRejectedValueOnce(new Error("offline"))
    const hook = mount()
    await hook.result().search()
    const retry = hook.result().search()
    expect(hook.result().result).toBeNull()
    await retry
    expect(hook.result()).toMatchObject({
      result: null,
      isPending: false,
      isError: true,
    })
    hook.unmount()
  })
  it("clear cancels and no empty or hidden input sends a request", async () => {
    const old = deferred()
    request.mockReturnValueOnce(old.promise)
    const hook = mount()
    const first = hook.result().search()
    hook.edit("  ")
    expect(request.mock.calls[0][1]!.aborted).toBe(true)
    await hook.result().search()
    hook.edit("강남")
    hook.visible(false)
    await hook.result().search()
    expect(request).toHaveBeenCalledTimes(1)
    old.resolve(result)
    await first
    expect(hook.result().result).toBeNull()
    hook.unmount()
  })
  it("unmount aborts and ignores transports which still return a success", async () => {
    const old = deferred()
    request.mockReturnValueOnce(old.promise)
    const hook = mount()
    const first = hook.result().search()
    const count = hook.renderCount()
    hook.unmount()
    expect(request.mock.calls[0][1]!.aborted).toBe(true)
    old.resolve(result)
    expect(await first).toBeNull()
    expect(hook.renderCount()).toBe(count)
  })
  it("coalesces a double tap and keeps equivalent whitespace edits", async () => {
    const old = deferred()
    request.mockReturnValueOnce(old.promise)
    const hook = mount()
    const first = hook.result().search()
    await hook.result().search()
    hook.edit(" 서초 한식  ")
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][1]!.aborted).toBe(false)
    old.resolve(result)
    await first
    expect(hook.result().result).toBe(result)
    hook.unmount()
  })
})

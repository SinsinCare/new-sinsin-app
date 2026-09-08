import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useAvailableRestaurantSort } from "../src/features/restaurant/hooks/useAvailableRestaurantSort"
import type { SortOption } from "../src/features/restaurant/types"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: jest.requireActual("./helpers/effectHookHarness").useEffect,
}))

test("reconciles a newly applied AI distance sort even when location remains unavailable", () => {
  let sort: SortOption = "RECOMMENDED"
  const sanitize = jest.fn()
  const h = renderHookWithEffects(() =>
    useAvailableRestaurantSort(sort, false, sanitize),
  )
  expect(sanitize).not.toHaveBeenCalled()
  sort = "DISTANCE"
  h.rerender()
  expect(sanitize).toHaveBeenCalledWith(false)
  expect(sanitize).toHaveBeenCalledTimes(1)
  h.rerender()
  expect(sanitize).toHaveBeenCalledTimes(1)
  h.unmount()
})
test("keeps distance sorting with a location and reconciles when location is lost", () => {
  let hasLocation = true
  const sanitize = jest.fn()
  const h = renderHookWithEffects(() =>
    useAvailableRestaurantSort("DISTANCE", hasLocation, sanitize),
  )
  expect(sanitize).not.toHaveBeenCalled()
  hasLocation = false
  h.rerender()
  expect(sanitize).toHaveBeenCalledWith(false)
  h.unmount()
})

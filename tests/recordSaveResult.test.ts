/* eslint-disable import/first -- isolate API boundaries, execute the original save hooks. */
const mockWeight = jest.fn()
const mockPressure = jest.fn()
const mockInvalidate = jest.fn()
const mockPresentError = jest.fn()
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.requireActual("./helpers/hookHarness").useState,
}))
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}))
jest.mock("../src/services/data/weightEdemaService", () => ({
  weightEdemaService: { updateWeight: mockWeight },
}))
jest.mock("../src/services/data/bloodMetricsService", () => ({
  bloodMetricsService: { updateBloodPressure: mockPressure },
}))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/lib/errorMessage", () => ({
  presentError: mockPresentError,
  toAnalyticsFailKind: () => "network",
}))
import { useWeightEdemaRecord } from "../src/features/home/hooks/useWeightEdemaRecord"
import { useBloodMetricsRecord } from "../src/features/home/hooks/useBloodMetricsRecord"
import { renderHookSync } from "./helpers/hookHarness"
/* eslint-enable import/first */

beforeEach(() => jest.clearAllMocks())
test("weight returns a positive acknowledgement only after the write succeeds", async () => {
  const hook = renderHookSync(useWeightEdemaRecord)
  mockWeight.mockResolvedValueOnce(undefined)
  expect(await hook.result().updateWeight(60, "2026-09-05", false)).toBe(true)
  mockWeight.mockRejectedValueOnce(new Error("offline fixture"))
  expect(await hook.result().updateWeight(60, "2026-09-05", false)).toBe(false)
  expect(hook.result().isLoading).toBe(false)
  expect(mockPresentError).toHaveBeenCalledTimes(1)
})
test("blood pressure preserves bedtime timing and reports a rejected write as failure", async () => {
  const hook = renderHookSync(useBloodMetricsRecord)
  const body = {
    date: "2026-09-05",
    systolic: 120,
    diastolic: 80,
    heartRate: null,
    slot: "BEDTIME" as const,
    timing: null,
  }
  mockPressure.mockResolvedValueOnce(undefined)
  expect(await hook.result().updateBloodPressure(body, false)).toBe(true)
  expect(mockPressure).toHaveBeenCalledWith(body)
  mockPressure.mockRejectedValueOnce(new Error("offline fixture"))
  expect(await hook.result().updateBloodPressure(body, false)).toBe(false)
  expect(hook.result().isLoading).toBe(false)
  expect(mockPresentError).toHaveBeenCalledTimes(1)
})

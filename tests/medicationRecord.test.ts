import { readFileSync } from "node:fs"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useMedicationRecord } from "../src/features/home/hooks/useMedicationRecord"
import { medicationService } from "../src/services/data/medicationService"
import type { MedicationPageParams } from "../src/features/home/stores/recordPageStore"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.requireActual("./helpers/effectHookHarness").useState,
  useRef: jest.requireActual("./helpers/effectHookHarness").useRef,
  useEffect: jest.requireActual("./helpers/effectHookHarness").useEffect,
}))
const mockPost = jest.fn()
const mockError = jest.fn()
jest.mock("../src/services/core", () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}))
jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/lib/haptics", () => ({ hapticStepAdvance: jest.fn() }))
jest.mock("../src/lib/errorMessage", () => ({
  presentError: (...args: unknown[]) => mockError(...args),
}))
jest.mock("../src/features/home/hooks/useRecordExitGuard", () => ({
  useRecordExitGuard: jest.fn(),
}))
jest.mock("../src/features/home/hooks/useHealthEntryInput", () => ({
  useHealthEntryInput: () => jest.fn(),
}))
const guard = () =>
  jest.requireMock("../src/features/home/hooks/useRecordExitGuard")
    .useRecordExitGuard.mock.lastCall[0]
const response = {
  data: {
    result: {
      intakeId: 17,
      date: "2026-09-05",
      takenAt: "2026-09-05T07:00:00",
      taken: 3,
      planned: 4,
    },
  },
}
function setup() {
  const params: MedicationPageParams = {
    kind: "medication",
    date: "2026-09-05",
    taken: 2,
    planned: 4,
    onSubmit: () => medicationService.recordIntake("2026-09-05"),
  }
  return renderHookWithEffects(() => useMedicationRecord(params, jest.fn()))
}
beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mockPost.mockReset()
})
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

test("unselected medication cannot create an intake", async () => {
  const hook = setup()
  expect(await hook.result().submit()).toBe(false)
  expect(mockPost).not.toHaveBeenCalled()
  expect(guard().hasChanges).toBe(false)
})
test("rapid repeated saves create one intake and only a confirmed response updates the visible count", async () => {
  let resolve!: (value: typeof response) => void
  mockPost.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const hook = setup()
  hook.result().toggle()
  const pending = hook.result().submit()
  expect(await hook.result().submit()).toBe(false)
  expect(mockPost).toHaveBeenCalledTimes(1)
  expect(mockPost).toHaveBeenCalledWith("/medications/intakes", {
    date: "2026-09-05",
    scheduleId: null,
  })
  expect(hook.result().summary.taken).toBe(2)
  expect(guard().isSaving).toBe(true)
  resolve(response)
  expect(await pending).toBe(true)
  expect(hook.result().summary).toEqual({ taken: 3, planned: 4 })
  expect(hook.result().selected).toBe(false)
  expect(guard().hasChanges).toBe(false)
  expect(await hook.result().submit()).toBe(false)
  expect(mockPost).toHaveBeenCalledTimes(1)
  hook.unmount()
})
test("a failed request preserves the selected dose and count and can be retried", async () => {
  mockPost
    .mockRejectedValueOnce(new Error("offline fixture"))
    .mockResolvedValueOnce(response)
  const hook = setup()
  hook.result().toggle()
  expect(await hook.result().submit()).toBe(false)
  expect(hook.result().selected).toBe(true)
  expect(hook.result().summary.taken).toBe(2)
  expect(guard().hasChanges).toBe(true)
  expect(mockError).toHaveBeenCalledTimes(1)
  expect(await hook.result().submit()).toBe(true)
  expect(hook.result().summary.taken).toBe(3)
  hook.unmount()
})
test("the home medication action opens an independent page and the route shares guarded cleanup", () => {
  const home = readFileSync(
    "src/features/home/components/record/RecordView.tsx",
    "utf8",
  )
  expect(home).toContain("onPress: openMedicationPage")
  expect(home).toContain('pathname: "/record/medication"')
  expect(home).not.toContain("medicationService.recordIntake(selectedDateStr)")
  expect(readFileSync("app/record/medication.tsx", "utf8")).toContain(
    "MedicationRecordScreen as default",
  )
  expect(
    readFileSync("src/features/home/views/MedicationRecordScreen.tsx", "utf8"),
  ).toContain("<MedicationDiaryPage")
})

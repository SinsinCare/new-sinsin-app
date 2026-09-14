import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useBloodPressureRecordForm } from "../src/features/home/hooks/useBloodPressureRecordForm"
import { useWeightRecordForm } from "../src/features/home/hooks/useWeightRecordForm"
import type {
  BloodPressurePageParams,
  WeightPageParams,
} from "../src/features/home/stores/recordPageStore"
import type { BloodPressureRangeRecord } from "../src/types/bloodMetrics"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.requireActual("./helpers/effectHookHarness").useState,
  useRef: jest.requireActual("./helpers/effectHookHarness").useRef,
  useEffect: jest.requireActual("./helpers/effectHookHarness").useEffect,
}))
jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/lib/haptics", () => ({ hapticStepAdvance: jest.fn() }))
jest.mock("../src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("../src/features/home/hooks/useRecordExitGuard", () => ({
  useRecordExitGuard: jest.fn(),
}))
jest.mock("../src/features/home/hooks/useHealthEntryInput", () => ({
  useHealthEntryInput: () => jest.fn(),
}))
const guard = () =>
  jest.requireMock("../src/features/home/hooks/useRecordExitGuard")
    .useRecordExitGuard.mock.lastCall[0]
beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
})
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})
function pressure(
  initial: BloodPressureRangeRecord[] = [],
  submit = jest.fn(async () => true),
) {
  let rows = initial
  const params: BloodPressurePageParams = {
    kind: "bloodPressure",
    date: "2026-09-05",
    isSaving: false,
    onSubmit: submit,
  }
  const refresh = jest.fn(async () => {})
  const hook = renderHookWithEffects(() =>
    useBloodPressureRecordForm(params, rows, refresh, jest.fn()),
  )
  return {
    hook,
    submit,
    refresh,
    setRows: (next: BloodPressureRangeRecord[]) => {
      rows = next
      hook.rerender()
    },
  }
}
const stored: BloodPressureRangeRecord = {
  recordDate: "2026-09-05",
  slot: "BREAKFAST",
  timing: "FASTING",
  systolic: 128,
  diastolic: 82,
  heartRate: null,
  recordedAt: null,
}
test("pressure context correction carries a new reading and bedtime removes meal timing", async () => {
  const { hook, submit } = pressure()
  hook.result().setReading("systolic", "123")
  hook.result().setReading("diastolic", "81")
  hook.result().changeSlot("BEDTIME")
  expect(hook.result().draft).toMatchObject({
    systolic: "123",
    diastolic: "81",
  })
  expect(guard().hasChanges).toBe(true)
  await hook.result().submit()
  expect(submit).toHaveBeenCalledWith({
    systolic: 123,
    diastolic: 81,
    heartRate: null,
    slot: "BEDTIME",
    timing: null,
  })
  expect(guard().hasChanges).toBe(false)
})
test("pressure edits survive a context round trip and a background history refresh", () => {
  const { hook, setRows } = pressure([stored])
  hook.result().setReading("diastolic", "85")
  hook.result().changeSlot("DINNER")
  expect(hook.result().draft.diastolic).toBe("")
  hook.result().changeSlot("BREAKFAST")
  setRows([{ ...stored, diastolic: 83 }])
  expect(hook.result().draft.diastolic).toBe("85")
  expect(guard().hasChanges).toBe(true)
})
test("pressure enforces each API bound and distinguishes an omitted pulse from zero", async () => {
  const { hook, submit } = pressure()
  hook.result().setReading("systolic", "301")
  hook.result().setReading("diastolic", "201")
  await hook.result().submit()
  expect(submit).not.toHaveBeenCalled()
  hook.result().setReading("systolic", "300")
  hook.result().setReading("diastolic", "200")
  for (const pulse of ["0", "251"]) {
    hook.result().setReading("heartRate", pulse)
    expect(hook.result().canSubmit).toBe(false)
  }
  hook.result().setReading("heartRate", "250")
  expect(hook.result().canSubmit).toBe(true)
  hook.result().setReading("heartRate", "")
  expect(hook.result().canSubmit).toBe(true)
})
test("failed pressure save keeps the draft protected and does not refresh history", async () => {
  const { hook, refresh } = pressure(
    [stored],
    jest.fn(async () => false),
  )
  hook.result().setReading("systolic", "129")
  expect(await hook.result().submit()).toBe(false)
  expect(hook.result().draft.systolic).toBe("129")
  expect(guard().hasChanges).toBe(true)
  expect(refresh).not.toHaveBeenCalled()
})
test("rapid repeated pressure save submits once and locks edits while awaiting it", async () => {
  let resolve!: (ok: boolean) => void
  const submit = jest.fn(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  const { hook } = pressure([stored], submit)
  const first = hook.result().submit()
  const second = hook.result().submit()
  hook.result().setReading("systolic", "200")
  expect(hook.result().draft.systolic).toBe("128")
  expect(submit).toHaveBeenCalledTimes(1)
  resolve(true)
  await Promise.all([first, second])
})
function weight(onSubmit = jest.fn(async () => true)) {
  const params: WeightPageParams = {
    kind: "weight",
    today: { weightKg: 62.4 } as WeightPageParams["today"],
    endDate: "2026-09-05",
    isSaving: false,
    onSubmit,
  }
  const refresh = jest.fn(async () => {})
  return {
    params,
    refresh,
    hook: renderHookWithEffects(() =>
      useWeightRecordForm(params, refresh, jest.fn()),
    ),
  }
}
test("weight is seeded on the first render and restores a clean exit when reverted", () => {
  const { hook } = weight()
  expect(hook.renderCount()).toBe(1)
  expect(hook.result().text).toBe("62.4")
  expect(guard().hasChanges).toBe(false)
  hook.result().changeText("62.5")
  expect(guard().hasChanges).toBe(true)
  hook.result().changeText("62.4")
  expect(guard().hasChanges).toBe(false)
})
test("weight accepts leading decimal entry, rejects the upper bound, and keeps a failed draft", async () => {
  const { hook, refresh } = weight(jest.fn(async () => false))
  hook.result().changeText(".5")
  expect(hook.result().text).toBe("0.5")
  expect(hook.result().canSubmit).toBe(true)
  hook.result().changeText("300.1")
  expect(hook.result().canSubmit).toBe(false)
  hook.result().changeText("61.8")
  expect(await hook.result().submit()).toBe(false)
  expect(hook.result().text).toBe("61.8")
  expect(guard().hasChanges).toBe(true)
  expect(refresh).not.toHaveBeenCalled()
})
test("confirmed weight save normalizes precision, updates history and clears the dirty baseline", async () => {
  const { hook, params, refresh } = weight()
  hook.result().changeText("63")
  await hook.result().submit()
  expect(params.onSubmit).toHaveBeenCalledWith(63)
  expect(hook.result().text).toBe("63.0")
  expect(guard().hasChanges).toBe(false)
  expect(refresh).toHaveBeenCalledTimes(1)
})

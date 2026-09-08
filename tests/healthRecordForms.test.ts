import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useGlucoseRecordForm } from "../src/features/home/hooks/useGlucoseRecordForm"
import { useEdemaRecordForm } from "../src/features/home/hooks/useEdemaRecordForm"
import { edemaEntry } from "../src/features/home/utils/edemaEntry"
import type {
  BloodGlucosePageParams,
  EdemaPageParams,
} from "../src/features/home/stores/recordPageStore"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.requireActual("./helpers/effectHookHarness").useState,
  useRef: jest.requireActual("./helpers/effectHookHarness").useRef,
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/features/home/hooks/useRecordExitGuard", () => ({
  useRecordExitGuard: jest.fn(),
}))
jest.mock("../src/features/home/hooks/useHealthEntryInput", () => ({
  useHealthEntryInput: () => jest.fn(),
}))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/features/home/hooks/useRecordSaveFeedback", () => ({
  useRecordSaveFeedback: () => ({
    isSaving: false,
    saved: false,
    reset: jest.fn(),
    run: (fn: () => Promise<boolean>) => fn(),
  }),
}))
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
const guard = () =>
  jest.requireMock("../src/features/home/hooks/useRecordExitGuard")
    .useRecordExitGuard.mock.lastCall[0]
const glucose = (extra: Partial<BloodGlucosePageParams> = {}) => {
  const params: BloodGlucosePageParams = {
    kind: "bloodGlucose",
    date: "2026-09-05",
    records: [],
    onSubmit: jest.fn(async () => true),
    ...extra,
  }
  return {
    params,
    hook: renderHookWithEffects(() => useGlucoseRecordForm(params, jest.fn())),
  }
}
const edema = (extra: Partial<EdemaPageParams> = {}) => {
  const params: EdemaPageParams = {
    kind: "edema",
    date: "2026-09-05",
    today: null,
    previous: null,
    onSubmit: jest.fn(async () => true),
    ...extra,
  }
  return {
    params,
    hook: renderHookWithEffects(() => useEdemaRecordForm(params, jest.fn())),
  }
}

test("correcting glucose context preserves the entered reading; fasting strips meal and elapsed", async () => {
  const { hook, params } = glucose()
  hook.result().setText("123")
  hook.result().changeCell({ timing: "AFTER_MEAL", slot: "DINNER" })
  expect(hook.result().draft.text).toBe("123")
  hook.result().changeCell({ timing: "FASTING", slot: "" })
  hook.result().submit()
  await flush()
  expect(params.onSubmit).toHaveBeenCalledWith({
    value: 123,
    timing: "FASTING",
    slot: null,
    elapsed: null,
  })
  expect(guard().hasChanges).toBe(false)
  expect(hook.result().records[0]?.value).toBe(123)
})
test("a failed save leaves the reading, exit protection, and empty history intact", async () => {
  const { hook } = glucose({ onSubmit: async () => false })
  hook.result().setText("135")
  hook.result().submit()
  await flush()
  expect(hook.result().draft.text).toBe("135")
  expect(hook.result().records).toHaveLength(0)
  expect(guard().hasChanges).toBe(true)
})
test("temporarily choosing fasting preserves meal and elapsed choices on return", () => {
  const { hook } = glucose()
  hook.result().changeCell({ timing: "AFTER_MEAL", slot: "DINNER" })
  hook.result().setText("123")
  hook.result().setElapsed("1H")
  hook.result().changeTiming("FASTING")
  expect(hook.result().cell.slot).toBe("")
  hook.result().changeTiming("AFTER_MEAL")
  expect(hook.result().cell.slot).toBe("DINNER")
  expect(hook.result().draft).toEqual({ text: "123", elapsed: "1H" })
})
test("existing glucose cells do not replace another cell's unsaved edit", () => {
  const { hook } = glucose({
    records: [
      {
        value: 90,
        timing: "FASTING",
        slot: "",
        elapsed: null,
        recordDate: "2026-09-05",
      },
      {
        value: 155,
        timing: "AFTER_MEAL",
        slot: "DINNER",
        elapsed: "2H",
        recordDate: "2026-09-05",
      },
    ],
  })
  hook.result().setText("99")
  hook.result().changeCell({ timing: "AFTER_MEAL", slot: "DINNER" })
  expect(hook.result().draft.text).toBe("155")
  hook.result().changeCell({ timing: "FASTING", slot: "" })
  expect(hook.result().draft.text).toBe("99")
})
test("zero and empty glucose cannot be submitted", () => {
  const { hook, params } = glucose()
  hook.result().submit()
  hook.result().setText("0")
  hook.result().submit()
  expect(params.onSubmit).not.toHaveBeenCalled()
})
test("glucose uses the API's 600 mg/dL boundary", async () => {
  const { hook, params } = glucose()
  hook.result().setText("601")
  hook.result().submit()
  expect(params.onSubmit).not.toHaveBeenCalled()
  hook.result().setText("600")
  hook.result().submit()
  await flush()
  expect(params.onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ value: 600 }),
  )
})
test("swelling retains per-area entries and saves their strongest self-reported level", async () => {
  const { hook, params } = edema()
  hook.result().selectPart("ANKLES")
  hook.result().setLevel("SLIGHT")
  hook.result().setPitting(true)
  hook.result().selectPart("FACE")
  expect(hook.result().valid).toBe(false)
  hook.result().setLevel("SEVERE")
  hook.result().selectPart("ANKLES")
  expect(hook.result().current?.pitting).toBe(true)
  hook.result().submit()
  await flush()
  expect(params.onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      edemaLevel: "SEVERE",
      observations: expect.arrayContaining([
        { part: "ANKLES", level: "SLIGHT", pitting: true },
      ]),
    }),
  )
  expect(guard().hasChanges).toBe(false)
  expect(hook.result().storedLevel).toBe("SEVERE")
})
test("no swelling skips detail and clears previous area entries only after successful save", async () => {
  const { hook, params } = edema()
  hook.result().selectPart("HANDS")
  hook.result().setLevel("SLIGHT")
  hook.result().selectNone()
  hook.result().submit()
  await flush()
  expect(params.onSubmit).toHaveBeenCalledWith({
    edemaLevel: "NONE",
    observations: [],
  })
  expect(hook.result().observations).toEqual([])
})
test("pitting alone never changes daily swelling severity", () => {
  expect(
    edemaEntry([{ part: "ANKLES", level: "SLIGHT", pitting: true }]).edemaLevel,
  ).toBe("SLIGHT")
  expect(
    edemaEntry([{ part: "ANKLES", level: "NONE", pitting: true }])
      .observations[0]?.pitting,
  ).toBeNull()
})

test("temporarily choosing no swelling restores all area details and the active area on reversal", () => {
  const { hook } = edema()
  hook.result().selectPart("ANKLES")
  hook.result().setLevel("SLIGHT")
  hook.result().setPitting(true)
  hook.result().selectPart("FACE")
  hook.result().setLevel("SEVERE")
  const observations = hook.result().observations
  hook.result().selectNone()
  expect(hook.result().none).toBe(true)
  expect(hook.result().valid).toBe(true)
  hook.result().selectNone()
  expect(hook.result().none).toBe(false)
  expect(hook.result().observations).toEqual(observations)
  expect(hook.result().part).toBe("FACE")
  hook.result().selectPart("ANKLES")
  expect(hook.result().current).toEqual({
    part: "ANKLES",
    level: "SLIGHT",
    pitting: true,
  })
  expect(guard().hasChanges).toBe(true)
})
test("toggling none back off does not create a valid blank observation", () => {
  const { hook, params } = edema()
  hook.result().selectNone()
  hook.result().selectNone()
  expect(hook.result().valid).toBe(false)
  hook.result().submit()
  expect(params.onSubmit).not.toHaveBeenCalled()
  expect(guard().hasChanges).toBe(false)
})

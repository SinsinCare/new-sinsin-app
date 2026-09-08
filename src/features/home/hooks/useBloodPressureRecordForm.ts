import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { BloodPressureRangeRecord } from "@/src/types/bloodMetrics"
import type { BloodPressurePageParams } from "../stores/recordPageStore"
import { useRecordExitGuard } from "./useRecordExitGuard"
import { useRecordSaveFeedback } from "./useRecordSaveFeedback"
import { useHealthEntryInput } from "./useHealthEntryInput"

type Submission = Parameters<BloodPressurePageParams["onSubmit"]>[0]
type Context = {
  slot: Submission["slot"]
  timing: NonNullable<Submission["timing"]>
}
type Reading = { systolic: string; diastolic: string; heartRate: string }
const EMPTY: Reading = { systolic: "", diastolic: "", heartRate: "" }
export const TIMELESS_SLOT = "BEDTIME"
const keyOf = ({ slot, timing }: Context) =>
  `${slot}|${slot === TIMELESS_SLOT ? "" : timing}`
const same = (a: Reading, b: Reading) =>
  a.systolic === b.systolic &&
  a.diastolic === b.diastolic &&
  a.heartRate === b.heartRate
// Existing API bounds: sinsin-be-bun/src/domains/shared/clinicalBounds.ts.
const within = (text: string, max: number) =>
  /^\d{1,3}$/u.test(text) && Number(text) > 0 && Number(text) <= max

/** Each measured context keeps its own draft; changing context never silently deletes an edit. */
export function useBloodPressureRecordForm(
  params: BloodPressurePageParams,
  rows: BloodPressureRangeRecord[],
  refresh: () => Promise<unknown>,
  onBack: () => void,
) {
  const { t } = useTranslation("common")
  const save = useRecordSaveFeedback()
  const mark = useHealthEntryInput("blood_pressure", true)
  const [context, setContext] = useState<Context>({
    slot: "BREAKFAST",
    timing: "FASTING",
  })
  const [drafts, setDrafts] = useState<Record<string, Reading>>({})
  const [confirmed, setConfirmed] = useState<Record<string, Reading>>({})
  const key = keyOf(context)
  const stored = (cellKey: string): Reading => {
    if (confirmed[cellKey]) return confirmed[cellKey]
    const row = rows.find(
      (item) => `${item.slot}|${item.timing ?? ""}` === cellKey,
    )
    return row
      ? {
          systolic: String(row.systolic),
          diastolic: String(row.diastolic),
          heartRate: row.heartRate == null ? "" : String(row.heartRate),
        }
      : EMPTY
  }
  const draft = drafts[key] ?? stored(key)
  const hasChanges = Object.entries(drafts).some(
    ([cellKey, reading]) => !same(reading, stored(cellKey)),
  )
  const busy = save.isSaving || params.isSaving
  useRecordExitGuard({
    hasChanges,
    isSaving: busy,
    onBack,
    confirmation: {
      title: t("home.recordPage.water.exitTitle"),
      description: t("home.recordPage.exitDescription"),
    },
  })
  const errors = {
    systolic: draft.systolic !== "" && !within(draft.systolic, 300),
    diastolic: draft.diastolic !== "" && !within(draft.diastolic, 200),
    heartRate: draft.heartRate !== "" && !within(draft.heartRate, 250),
  }
  const canSubmit =
    within(draft.systolic, 300) &&
    within(draft.diastolic, 200) &&
    !errors.heartRate
  const setReading = (field: keyof Reading, text: string) => {
    if (busy) return
    save.reset()
    if (text) mark("keypad")
    setDrafts((previous) => ({
      ...previous,
      [key]: { ...draft, [field]: text.replace(/\D/gu, "").slice(0, 3) },
    }))
  }
  const changeContext = (next: Context) => {
    if (busy || keyOf(next) === key) return
    save.reset()
    const nextKey = keyOf(next)
    // Correcting an as-yet unrecorded measurement's context carries its value.
    // Existing measurements and existing drafts retain their independent values.
    if (
      !drafts[nextKey] &&
      stored(key) === EMPTY &&
      stored(nextKey) === EMPTY &&
      !same(draft, EMPTY)
    ) {
      setDrafts((previous) => {
        const copy = { ...previous }
        delete copy[key]
        return { ...copy, [nextKey]: draft }
      })
    }
    setContext(next)
  }
  const submit = async () => {
    if (!canSubmit || busy) return false
    return save.run(async () => {
      const ok = await params.onSubmit({
        systolic: Number(draft.systolic),
        diastolic: Number(draft.diastolic),
        heartRate: draft.heartRate ? Number(draft.heartRate) : null,
        slot: context.slot,
        timing: context.slot === TIMELESS_SLOT ? null : context.timing,
      })
      if (!ok) return false
      setConfirmed((previous) => ({ ...previous, [key]: draft }))
      setDrafts((previous) => {
        const copy = { ...previous }
        delete copy[key]
        return copy
      })
      await refresh()
      return true
    })
  }
  return {
    ...context,
    draft,
    save,
    errors,
    canSubmit,
    hasChanges,
    setReading,
    submit,
    changeSlot: (slot: Context["slot"]) => changeContext({ ...context, slot }),
    changeTiming: (timing: Context["timing"]) =>
      changeContext({ ...context, timing }),
  }
}

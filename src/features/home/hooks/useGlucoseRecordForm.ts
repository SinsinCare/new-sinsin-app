import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { BloodGlucosePageParams } from "../stores/recordPageStore"
import {
  findGlucoseCell,
  glucoseCellKey,
  slotForSubmit,
  type GlucoseCell,
} from "../utils/glucoseGrid"
import type { GlucoseElapsed } from "../data/bloodMetricsConstants"
import { useRecordSaveFeedback } from "./useRecordSaveFeedback"
import { useRecordExitGuard } from "./useRecordExitGuard"
import { useHealthEntryInput } from "./useHealthEntryInput"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useGlucoseRecordForm(
  params: BloodGlucosePageParams,
  onBack: () => void,
) {
  const { t } = useTranslation("common")
  const save = useRecordSaveFeedback()
  const mark = useHealthEntryInput("blood_glucose", true)
  const [records, setRecords] = useState(params.records)
  const [cell, setCell] = useState<GlucoseCell>(() => {
    const timing =
      params.inference?.timing ?? params.records[0]?.timing ?? "FASTING"
    return {
      timing,
      slot:
        timing === "FASTING"
          ? ""
          : (params.inference?.slot ?? params.records[0]?.slot ?? ""),
    }
  })
  const opened = useRef(cell)
  const mealSlot = useRef(cell.slot)
  const initial = (target: GlucoseCell) => {
    const row = findGlucoseCell(records, target)
    return {
      text: row ? String(row.value) : "",
      elapsed:
        row?.elapsed ?? params.inference?.elapsed ?? ("2H" as GlucoseElapsed),
    }
  }
  const [drafts, setDrafts] = useState<
    Record<string, { text: string; elapsed: GlucoseElapsed }>
  >({})
  const [touched, setTouched] = useState(false)
  const key = glucoseCellKey(cell)
  const draft = drafts[key] ?? initial(cell)
  const value = /^\d{1,3}$/u.test(draft.text) ? Number(draft.text) : null
  // Match the existing glucoseMgDl API bound, rather than accepting a doomed save.
  const valid = value !== null && value >= 1 && value <= 600
  const hasChanges = Object.entries(drafts).some(([entryKey, entry]) => {
    const [slot, timing] = entryKey.split("|")
    const row = findGlucoseCell(records, { slot, timing } as GlucoseCell)
    return (
      entry.text !== (row ? String(row.value) : "") ||
      (entry.text !== "" &&
        timing === "AFTER_MEAL" &&
        entry.elapsed !== (row?.elapsed ?? "2H"))
    )
  })
  useRecordExitGuard({
    hasChanges,
    isSaving: save.isSaving,
    onBack,
    confirmation: {
      title: t("home.recordPage.water.exitTitle"),
      description: t("home.recordPage.exitDescription"),
    },
  })
  const update = (next: Partial<typeof draft>) => {
    save.reset()
    setDrafts((prev) => ({ ...prev, [key]: { ...draft, ...next } }))
  }
  const changeCell = (next: GlucoseCell) => {
    if (save.isSaving) return
    if (next.timing !== "FASTING") mealSlot.current = next.slot
    save.reset()
    setTouched(true)
    // Keep an unsaved measurement when correcting its context; existing cells keep their own value.
    if (
      !drafts[glucoseCellKey(next)] &&
      !findGlucoseCell(records, next) &&
      !findGlucoseCell(records, cell)
    ) {
      setDrafts((prev) => {
        const copy = { ...prev }
        delete copy[key]
        return { ...copy, [glucoseCellKey(next)]: draft }
      })
    }
    trackAnalyticsEvent("health_entry_context_adjusted", {
      metric: "blood_glucose",
      timing: next.timing,
      auto:
        next.timing === opened.current.timing &&
        next.slot === opened.current.slot,
    })
    setCell(next)
  }
  const submit = () => {
    if (!valid || value === null) return
    void save.run(async () => {
      const body = {
        value,
        timing: cell.timing,
        elapsed: cell.timing === "AFTER_MEAL" ? draft.elapsed : null,
        slot: slotForSubmit(cell),
      }
      if (!(await params.onSubmit(body))) return false
      setRecords((prev) => [
        ...prev.filter(
          (row) => glucoseCellKey({ ...row, slot: row.slot ?? "" }) !== key,
        ),
        { ...body, slot: body.slot ?? "", recordDate: params.date },
      ])
      setDrafts((prev) => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
      return true
    })
  }
  return {
    cell,
    draft,
    records,
    valid,
    touched,
    save,
    submit,
    changeCell,
    changeTiming: (timing: GlucoseCell["timing"]) =>
      changeCell({
        timing,
        slot: timing === "FASTING" ? "" : mealSlot.current,
      }),
    setText: (text: string) => {
      if (text) mark("keypad")
      update({ text: text.replace(/\D/gu, "").slice(0, 3) })
    },
    setElapsed: (elapsed: GlucoseElapsed) => {
      setTouched(true)
      update({ elapsed })
    },
  }
}

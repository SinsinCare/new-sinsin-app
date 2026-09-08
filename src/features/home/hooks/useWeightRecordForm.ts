import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { WeightPageParams } from "../stores/recordPageStore"
import { useRecordExitGuard } from "./useRecordExitGuard"
import { useRecordSaveFeedback } from "./useRecordSaveFeedback"
import { useHealthEntryInput } from "./useHealthEntryInput"

export function useWeightRecordForm(
  params: WeightPageParams,
  refresh: () => Promise<unknown>,
  onBack: () => void,
) {
  const { t } = useTranslation("common")
  const save = useRecordSaveFeedback()
  const mark = useHealthEntryInput("weight", true)
  // Seed before the first frame; background refreshes must not replace the draft.
  const [text, setText] = useState(
    () => params.today?.weightKg?.toFixed(1) ?? "",
  )
  const [baseline, setBaseline] = useState(text)
  const parsed = /^\d+(?:\.\d?)?$/u.test(text) ? Number(text) : NaN
  const weight = Number.isFinite(parsed) ? parsed : null
  const canSubmit = weight !== null && weight > 0 && weight <= 300
  const busy = save.isSaving || params.isSaving
  useRecordExitGuard({
    hasChanges: text !== baseline,
    isSaving: busy,
    onBack,
    confirmation: {
      title: t("home.recordPage.water.exitTitle"),
      description: t("home.recordPage.exitDescription"),
    },
  })
  const changeText = (next: string) => {
    if (busy) return
    save.reset()
    if (next) mark("keypad")
    const [head, ...rest] = next.replace(/[^0-9.]/gu, "").split(".")
    setText(
      (rest.length
        ? `${head || "0"}.${rest.join("").slice(0, 1)}`
        : head
      ).slice(0, 5),
    )
  }
  const submit = async () => {
    if (!canSubmit || weight === null || busy) return false
    return save.run(async () => {
      if (!(await params.onSubmit(Number(weight.toFixed(1))))) return false
      const savedText = weight.toFixed(1)
      setBaseline(savedText)
      setText(savedText)
      await refresh()
      return true
    })
  }
  return { text, weight, canSubmit, save, changeText, submit }
}

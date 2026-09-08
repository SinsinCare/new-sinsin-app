import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { MedicationPageParams } from "../stores/recordPageStore"
import { useRecordExitGuard } from "./useRecordExitGuard"
import { useRecordSaveFeedback } from "./useRecordSaveFeedback"
import { useHealthEntryInput } from "./useHealthEntryInput"

/** Keep the draft separate from the server-confirmed count; one selection is one intake. */
export function useMedicationRecord(
  params: MedicationPageParams,
  onBack: () => void,
) {
  const { t } = useTranslation("common")
  const save = useRecordSaveFeedback()
  const mark = useHealthEntryInput("medication", true)
  const [selected, setSelected] = useState(false)
  const selectedRef = useRef(false)
  const [summary, setSummary] = useState({
    taken: params.taken,
    planned: params.planned,
  })
  useRecordExitGuard({
    hasChanges: selected,
    isSaving: save.isSaving,
    onBack,
    confirmation: {
      title: t("home.recordPage.water.exitTitle"),
      description: t("home.recordPage.exitDescription"),
    },
  })
  const toggle = () => {
    if (save.isSaving) return
    save.reset()
    selectedRef.current = !selectedRef.current
    setSelected(selectedRef.current)
    mark("card")
  }
  const submit = async () => {
    if (!selectedRef.current) return false
    return save.run(async () => {
      const result = await params.onSubmit()
      setSummary({ taken: result.taken, planned: result.planned })
      selectedRef.current = false
      setSelected(false)
      return true
    })
  }
  return { selected, summary, save, toggle, submit }
}

import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { EdemaPageParams } from "../stores/recordPageStore"
import {
  edemaEntry,
  type EdemaObservation,
  type EdemaPart,
} from "../utils/edemaEntry"
import { normalizeEdemaLevel, type EdemaLevel } from "../data/EdemaConstants"
import { useRecordExitGuard } from "./useRecordExitGuard"
import { useRecordSaveFeedback } from "./useRecordSaveFeedback"
import { useHealthEntryInput } from "./useHealthEntryInput"

export function useEdemaRecordForm(
  params: EdemaPageParams,
  onBack: () => void,
) {
  const { t } = useTranslation("common")
  const save = useRecordSaveFeedback()
  const mark = useHealthEntryInput("edema", true)
  const [observations, setObservations] = useState<EdemaObservation[]>(
    params.today?.edemaObservations ?? [],
  )
  const [none, setNone] = useState(
    normalizeEdemaLevel(params.today?.edemaLevel) === "NONE",
  )
  const [part, setPart] = useState<EdemaPart | null>(
    observations[0]?.part ?? null,
  )
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify({ none, observations }),
  )
  const [storedLevel, setStoredLevel] = useState(
    normalizeEdemaLevel(params.today?.edemaLevel),
  )
  const current = observations.find((item) => item.part === part)
  const hasChanges = baseline !== JSON.stringify({ none, observations })
  useRecordExitGuard({
    hasChanges,
    isSaving: save.isSaving,
    onBack,
    confirmation: {
      title: t("home.recordPage.water.exitTitle"),
      description: t("home.recordPage.exitDescription"),
    },
  })
  const change = () => {
    save.reset()
    mark("card")
  }
  const setLevel = (level: EdemaLevel) => {
    if (!part) return
    change()
    setNone(false)
    setObservations((prev) =>
      [
        ...prev.filter((item) => item.part !== part),
        {
          part,
          level,
          pitting: level === "NONE" ? null : (current?.pitting ?? null),
        },
      ].sort((a, b) => a.part.localeCompare(b.part)),
    )
  }
  const entry = none
    ? { edemaLevel: "NONE" as const, observations: [] }
    : edemaEntry(observations)
  const valid = none || (observations.length > 0 && current !== undefined)
  const submit = () => {
    if (!valid) return
    void save.run(async () => {
      if (!(await params.onSubmit(entry))) return false
      const savedObservations = none ? [] : observations
      setObservations(savedObservations)
      setStoredLevel(entry.edemaLevel)
      setBaseline(JSON.stringify({ none, observations: savedObservations }))
      return true
    })
  }
  return {
    save,
    part,
    current,
    observations,
    storedLevel,
    none,
    valid,
    hasChanges,
    submit,
    selectPart: (value: EdemaPart) => {
      setPart(value)
      setNone(false)
      save.reset()
    },
    selectNone: () => {
      if (save.isSaving) return
      change()
      // This is a reversible shortcut. Keep the selected area and its draft
      // until a successful NONE save deliberately clears those observations.
      setNone((value) => !value)
    },
    setLevel,
    setPitting: (pitting: boolean | null) => {
      change()
      setObservations((prev) =>
        prev.map((item) => (item.part === part ? { ...item, pitting } : item)),
      )
    },
  }
}

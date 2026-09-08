import { useEffect, useRef } from "react"
import { useLocalSearchParams } from "expo-router"
import { useGoBack } from "@/src/shared/navigation"
import { useRecordPageStore } from "../stores/recordPageStore"
import { MedicationDiaryPage } from "@/src/features/medication/views/MedicationDiaryPage"
import {
  SLOTS,
  todayKst,
  validMedicationDate,
} from "@/src/features/medication/data/medicationModel"
import type { Slot } from "@/src/features/medication/types"
export function MedicationRecordScreen() {
  const query = useLocalSearchParams<{ date?: string; slot?: string }>(),
    params = useRecordPageStore((s) => s.params),
    owned = useRef(params)
  const onBack = useGoBack("/(tabs)/home")
  const date = validMedicationDate(query.date)
    ? query.date
    : params?.kind === "medication"
      ? params.date
      : todayKst()
  const preferred = SLOTS.includes(query.slot as Slot)
    ? (query.slot as Slot)
    : undefined
  useEffect(
    () => () => {
      const opened = owned.current
      if (opened?.kind !== "medication") return
      opened.onClose?.()
      if (useRecordPageStore.getState().params === opened)
        useRecordPageStore.getState().clear()
    },
    [],
  )
  return (
    <MedicationDiaryPage
      key={date}
      date={date}
      preferred={preferred}
      onBack={onBack}
    />
  )
}

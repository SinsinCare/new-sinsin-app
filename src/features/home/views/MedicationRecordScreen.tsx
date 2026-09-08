import { useLocalSearchParams } from "expo-router"
import { useGoBack } from "@/src/shared/navigation"
import { MedicationDiaryPage } from "@/src/features/medication/views/MedicationDiaryPage"
import {
  SLOTS,
  resolveDiaryEntry,
  todayKst,
  validMedicationDate,
} from "@/src/features/medication/data/medicationModel"
import type { Slot } from "@/src/features/medication/types"

/**
 * 약 복용 기록 페이지. 홈 타일과 알림이 `date`(선택 `slot`)를 쿼리로 넘긴다.
 * 새벽 4시 전에 "오늘" 로 들어오면 전날 자기전으로 연다(EX-10) — `shifted` 로 알린다.
 */
export function MedicationRecordScreen() {
  const query = useLocalSearchParams<{ date?: string; slot?: string }>()
  const onBack = useGoBack("/(tabs)/home")
  const requested = validMedicationDate(query.date) ? query.date : todayKst()
  const slot = SLOTS.includes(query.slot as Slot)
    ? (query.slot as Slot)
    : undefined
  const entry = resolveDiaryEntry(requested, slot)
  return (
    <MedicationDiaryPage
      key={entry.date}
      date={entry.date}
      preferred={entry.slot}
      shifted={entry.shifted}
      onBack={onBack}
    />
  )
}

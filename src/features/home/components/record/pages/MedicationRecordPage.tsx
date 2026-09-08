import type { MedicationPageParams } from "../../../stores/recordPageStore"
import { MedicationDiaryPage } from "@/src/features/medication/views/MedicationDiaryPage"
export function MedicationRecordPage({
  params,
  onBack,
}: {
  params: MedicationPageParams
  onBack: () => void
}) {
  return <MedicationDiaryPage date={params.date} onBack={onBack} />
}

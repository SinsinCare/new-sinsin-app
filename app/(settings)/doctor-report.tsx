/**
 * 담당의 리포트 상세. 공유 설정 화면의 리포트 카드가 `id` 를 들고 여기로 온다.
 */
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { DoctorReportDetailScreen } from "@/src/features/doctor-link"

export default function DoctorReportRoute() {
  const router = useAppRouter()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const reportId = Array.isArray(params.id) ? params.id[0] : params.id

  return (
    <DoctorReportDetailScreen
      reportId={reportId ?? ""}
      onBack={() => router.back()}
    />
  )
}

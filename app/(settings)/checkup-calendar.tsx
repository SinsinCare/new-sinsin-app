/** 검사 기록 월별 캘린더. "주별보기" 는 곧 상세로 돌아가는 것이다. */
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { CheckupCalendarScreen } from "@/src/features/health-checkup"
import { decodeResultIds } from "@/src/features/doctor-link/data/doctorParams"

export default function CheckupCalendarRoute() {
  const router = useAppRouter()
  const params = useLocalSearchParams<{ resultIds?: string | string[] }>()
  return (
    <CheckupCalendarScreen
      resultIds={decodeResultIds(params.resultIds)}
      onBack={() => router.back()}
    />
  )
}

import { foodCameraService } from "@/src/services/data"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"

import { diaryDateKeys } from "../components/calendar/calendarModel"
import { toDateStr } from "../utils/dateUtils"

export function useMonthDiaryExistence(
  year: number,
  month: number,
  enabled = true,
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // 그 달의 1일과 말일. `new Date(y, m + 1, 0)` 은 다음 달 0일 = 이번 달 마지막 날이다.
  const startDate = toDateStr(new Date(year, month, 1))
  const endDate = toDateStr(new Date(year, month + 1, 0))

  return useQuery({
    queryKey: ["diaryExistence", startDate, endDate],
    queryFn: () => foodCameraService.fetchDiaryExistence(startDate, endDate),
    enabled: isAuthenticated && enabled,
    // Reopening must pick up meals saved while this disabled query was closed.
    staleTime: 0,
    retry: 0,
    select: (data) => diaryDateKeys(data.result),
  })
}

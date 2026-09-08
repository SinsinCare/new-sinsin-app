import { foodCameraService } from "@/src/services/data"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"

import { diaryDateKeys } from "../components/calendar/calendarModel"

const pad = (n: number) => String(n).padStart(2, "0")

export function useMonthDiaryExistence(
  year: number,
  month: number,
  enabled = true,
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const startDate = `${year}-${pad(month + 1)}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`

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

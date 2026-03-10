import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"
import { foodCameraService } from "@/src/services/data"
import { toDateStr } from "../utils/dateUtils"

export function useStreak() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const today = new Date()

  const startDate = toDateStr(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
  )
  const endDate = toDateStr(today)

  return useQuery({
    queryKey: ["diaryExistence", startDate, endDate],
    queryFn: () => foodCameraService.fetchDiaryExistence(startDate, endDate),
    enabled: isAuthenticated,
    retry: 0,
    select: (data) => {
      const existingDates = new Set(
        data.result
          .filter((item) => item.exists)
          .map((item) => toDateStr(new Date(item.date))),
      )

      let streak = 0
      for (let i = 0; i <= 29; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        if (existingDates.has(toDateStr(d))) {
          streak++
        } else {
          break
        }
      }
      return streak
    },
  })
}

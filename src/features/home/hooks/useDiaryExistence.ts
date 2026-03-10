import { foodCameraService } from "@/src/services/data"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"
import { getWeekRange } from "../utils/getWeekRange"

export function useDiaryExistence(date: Date) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { startDate, endDate } = getWeekRange(date)

  return useQuery({
    queryKey: ["diaryExistence", startDate, endDate],
    queryFn: () => foodCameraService.fetchDiaryExistence(startDate, endDate),
    enabled: isAuthenticated,
    retry: 0,
    select: (data) =>
      data.result
        .filter((item) => item.exists)
        .map((item) => new Date(item.date).getDate()),
  })
}

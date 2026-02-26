import { foodCameraService } from "@/src/services/data"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"

export function useDateAnalysis(date: Date) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const pad = (n: number) => String(n).padStart(2, "0")
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  return useQuery({
    queryKey: ["dateAnalysis", dateStr],
    queryFn: async () => {
      try {
        const result = await foodCameraService.fetchDateAnalysis(dateStr)
        return result
      } catch (e) {
        console.error("[useDateAnalysis] error:", e)
        throw e
      }
    },
    enabled: isAuthenticated,
    retry: 0,
    staleTime: 0,
  })
}

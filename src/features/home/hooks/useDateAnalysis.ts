import { foodCameraService } from "@/src/services/data"
import { useQuery } from "@tanstack/react-query"

export function useDateAnalysis(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  return useQuery({
    queryKey: ["dateAnalysis", dateStr],
    queryFn: async () => {
      console.log("[useDateAnalysis] fetching:", dateStr)
      try {
        const result = await foodCameraService.fetchDateAnalysis(dateStr)
        console.log("[useDateAnalysis] result:", JSON.stringify(result))
        return result
      } catch (e) {
        console.error("[useDateAnalysis] error:", e)
        throw e
      }
    },
    retry: 0,
  })
}

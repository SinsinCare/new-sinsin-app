import { useQuery } from "@tanstack/react-query"
import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { toDateStr } from "../utils/dateUtils"

/** "YYYY-MM-DD" 에 일 단위를 더한다(현지 달력 기준). */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(year, month - 1, day + days)
  return toDateStr(date)
}

/**
 * 체중 시트의 7일 추세 데이터 — 선택한 날짜로 끝나는 7일 창.
 *
 * 시트가 열릴 때만 부른다(enabled). 홈 진입마다 부르면 시트를 한 번도 열지 않는
 * 날에도 요청이 나간다. 저장 후에는 useWeightEdemaRecord 가 ["weightRecords"] 를
 * 무효화해 다음 열림에 새 값이 온다.
 */
export function useWeightWeek(endDate: string, enabled: boolean) {
  const startDate = addDaysToDateStr(endDate, -6)
  return useQuery({
    queryKey: ["weightRecords", startDate, endDate],
    queryFn: () => weightEdemaService.fetchWeightRecords(startDate, endDate),
    enabled,
    staleTime: 60_000,
  })
}

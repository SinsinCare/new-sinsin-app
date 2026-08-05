import { useQuery } from "@tanstack/react-query"

import { bloodMetricsService } from "@/src/services/data/bloodMetricsService"
import { addDaysToDateStr } from "./useWeightWeek"

/**
 * 통계 혈당 추이가 쓰는 7일 창 — 선택한 날짜로 끝난다.
 *
 * 창 길이·키 모양은 체중(`useWeightWeek`)과 같다. 혈당 기록 저장 뒤에는
 * `useBloodMetricsRecord` 가 `["bloodGlucoseRecords"]` 를 무효화한다 — 그래야 방금 적은
 * 수치가 통계에서도 같은 화면 안에서 보인다.
 */
export function useGlucoseWeek(endDate: string, enabled: boolean) {
  const startDate = addDaysToDateStr(endDate, -6)
  return useQuery({
    queryKey: ["bloodGlucoseRecords", startDate, endDate],
    queryFn: () =>
      bloodMetricsService.fetchBloodGlucoseRecords(startDate, endDate),
    enabled,
    staleTime: 60_000,
  })
}

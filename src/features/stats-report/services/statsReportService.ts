import { api } from "@/src/services/core/apiClient"

import type { PeriodType, StatsReport } from "../types/report"

/**
 * 통계 리포트 조회.
 *
 * 끝난 기간은 서버가 저장해 두고 같은 결과를 돌려주므로 재조회를
 * 두려워하지 않아도 된다. 오늘/진행 중 기간만 매번 새로 계산된다.
 */
export async function fetchStatsReport(
  period: PeriodType,
  date: string,
): Promise<StatsReport> {
  // baseURL 에 이미 /api/v1 이 들어 있다. 여기에 또 붙이면 /api/v1/api/v1/... 이 된다.
  const res = await api.get("/statistics/report", {
    params: { period, date },
  })
  return (res.data.result ?? res.data.data) as StatsReport
}

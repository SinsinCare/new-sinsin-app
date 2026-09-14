import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { fetchStatsReport } from "../services/statsReportService"
import type { PeriodType, StatsReport } from "../types/report"
import { normalizeLanguage } from "@/src/i18n"
import {
  STATS_REPORT_QUERY_ROOT,
  statsReportKey,
} from "@/src/i18n/localeQueryKeys"
import type { RefreshScopeKeys } from "@/src/shared/refresh"

/**
 * 통계 리포트 화면의 새로고침 스코프. 뿌리 하나가 로케일·기간·날짜 전부를 덮고,
 * `useRefreshable` 은 `type: "active"` 로만 다시 받으므로 지금 보는 기간만 새로 온다.
 */
export const STATS_REPORT_REFRESH: RefreshScopeKeys = [[STATS_REPORT_QUERY_ROOT]]

/**
 * 기간별 통계 리포트. date 는 YYYY-MM-DD(로컬).
 *
 * 화면은 `isPending` 이 아니라 `isLoading` 을 본다 — enabled 가 꺼진
 * 쿼리는 isPending 이 영원히 true 라서 스켈레톤이 안 사라진다.
 */
export function useStatsReport(period: PeriodType, date: string) {
  const { i18n } = useTranslation()
  const locale = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  return useQuery<StatsReport>({
    queryKey: statsReportKey(period, date, locale),
    queryFn: () => fetchStatsReport(period, date),
    staleTime: 5 * 60 * 1000,
  })
}

import { useQuery } from "@tanstack/react-query"

import { fetchStatsReport } from "../services/statsReportService"
import type { PeriodType, StatsReport } from "../types/report"
import {
  getAppLanguage,
  normalizeLanguage,
  type Language,
} from "@/src/i18n"
import { useTranslation } from "react-i18next"
import { statsReportKey as buildStatsReportKey } from "@/src/i18n/localeQueryKeys"

export function statsReportKey(
  period: PeriodType,
  date: string,
  locale: Language = getAppLanguage(),
) {
  return buildStatsReportKey(period, date, locale)
}

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

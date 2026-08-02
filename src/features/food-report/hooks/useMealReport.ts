import { useQuery } from "@tanstack/react-query"

import { fetchMealReport } from "../services/mealReportService"
import type { MealReport } from "../types/report"
import { getAppLanguage, normalizeLanguage, type Language } from "@/src/i18n"
import { useTranslation } from "react-i18next"
import { mealReportKey as buildMealReportKey } from "@/src/i18n/localeQueryKeys"

export function mealReportKey(
  analysisId: number,
  date?: string,
  mealType?: string,
  locale: Language = getAppLanguage(),
) {
  return buildMealReportKey(analysisId, date, mealType, locale)
}

/**
 * 서버가 리포트를 저장해 두므로 캐시를 오래 잡아도 된다.
 * 분석이 수정되면 서버가 stale_key 로 알아서 다시 만든다.
 */
export function useMealReport(
  analysisId: number | null | undefined,
  options?: { date?: string; mealType?: string; enabled?: boolean },
) {
  const { i18n } = useTranslation()
  const locale = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  return useQuery<MealReport>({
    queryKey: mealReportKey(
      analysisId ?? 0,
      options?.date,
      options?.mealType,
      locale,
    ),
    queryFn: () =>
      fetchMealReport(analysisId as number, {
        date: options?.date,
        mealType: options?.mealType,
      }),
    enabled: Boolean(analysisId) && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

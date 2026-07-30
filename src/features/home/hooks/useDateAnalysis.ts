import { foodCameraService } from "@/src/services/data"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/src/stores/authStore"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { logRecoverableError } from "@/src/lib/errorUtils"
import { normalizeLanguage, type Language } from "@/src/i18n"
import { useTranslation } from "react-i18next"
import { dateAnalysisKey as buildDateAnalysisKey } from "@/src/i18n/localeQueryKeys"

export function dateAnalysisKey(date: string, locale: Language) {
  return buildDateAnalysisKey(date, locale)
}

export function useDateAnalysis(date: Date) {
  const { i18n } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const dateStr = toDateStr(date)
  const locale = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  return useQuery({
    queryKey: dateAnalysisKey(dateStr, locale),
    queryFn: async () => {
      try {
        const result = await foodCameraService.fetchDateAnalysis(dateStr)
        return result
      } catch (e) {
        logRecoverableError("[useDateAnalysis] error:", e)
        throw e
      }
    },
    enabled: isAuthenticated,
    retry: 0,
    staleTime: 0,
  })
}

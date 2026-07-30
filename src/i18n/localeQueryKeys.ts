import type { Language } from "./index"

export function diaryResultKey(diaryId: number, locale: Language) {
  return ["diaryResult", locale, diaryId] as const
}

export function mealReportKey(
  analysisId: number,
  date: string | undefined,
  mealType: string | undefined,
  locale: Language,
) {
  return [
    "mealReport",
    locale,
    analysisId,
    date ?? null,
    mealType ?? null,
  ] as const
}

export function statsReportKey(period: string, date: string, locale: Language) {
  return ["statsReport", locale, period, date] as const
}

export function dateAnalysisKey(date: string, locale: Language) {
  return ["dateAnalysis", date, locale] as const
}

export function healthResultDetailKey(resultId: string, locale: Language) {
  return ["health-check", "results", "detail", locale, resultId] as const
}

export function healthDashboardKey(locale: Language) {
  return ["health-check", "dashboard", locale] as const
}

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

/** `statsReportKey` 의 뿌리. 새로고침 스코프가 접두어로 쓴다 — 문자열을 복사해 두지 않는다. */
export const STATS_REPORT_QUERY_ROOT = "statsReport"

export function statsReportKey(period: string, date: string, locale: Language) {
  return [STATS_REPORT_QUERY_ROOT, locale, period, date] as const
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

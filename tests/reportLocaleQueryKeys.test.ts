import {
  dateAnalysisKey,
  diaryResultKey,
  healthDashboardKey,
  healthResultDetailKey,
  mealReportKey,
  statsReportKey,
} from "@/src/i18n/localeQueryKeys"

describe("localized report query keys", () => {
  it("keeps Korean and English saved-meal results in separate caches", () => {
    expect(diaryResultKey(41, "ko")).toEqual(["diaryResult", "ko", 41])
    expect(diaryResultKey(41, "en")).toEqual(["diaryResult", "en", 41])
  })

  it("keeps Korean and English meal reports in separate caches", () => {
    expect(mealReportKey(7, "2026-07-28", "LUNCH", "ko")).toEqual([
      "mealReport",
      "ko",
      7,
      "2026-07-28",
      "LUNCH",
    ])
    expect(mealReportKey(7, "2026-07-28", "LUNCH", "en")).toEqual([
      "mealReport",
      "en",
      7,
      "2026-07-28",
      "LUNCH",
    ])
  })

  it("keeps Korean and English statistics reports in separate caches", () => {
    expect(statsReportKey("week", "2026-07-28", "ko")).toEqual([
      "statsReport",
      "ko",
      "week",
      "2026-07-28",
    ])
    expect(statsReportKey("week", "2026-07-28", "en")).toEqual([
      "statsReport",
      "en",
      "week",
      "2026-07-28",
    ])
  })

  it("keeps localized daily guidance in separate caches", () => {
    expect(dateAnalysisKey("2026-07-28", "ko")).toEqual([
      "dateAnalysis",
      "2026-07-28",
      "ko",
    ])
    expect(dateAnalysisKey("2026-07-28", "en")).toEqual([
      "dateAnalysis",
      "2026-07-28",
      "en",
    ])
  })

  it("keeps localized health-check judgements in separate caches", () => {
    expect(healthResultDetailKey("17", "ko")).toEqual([
      "health-check",
      "results",
      "detail",
      "ko",
      "17",
    ])
    expect(healthResultDetailKey("17", "en")).toEqual([
      "health-check",
      "results",
      "detail",
      "en",
      "17",
    ])
    expect(healthDashboardKey("ko")).toEqual([
      "health-check",
      "dashboard",
      "ko",
    ])
    expect(healthDashboardKey("en")).toEqual([
      "health-check",
      "dashboard",
      "en",
    ])
  })
})

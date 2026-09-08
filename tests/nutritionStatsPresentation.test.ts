import {
  addDays,
  barFraction,
  chartScale,
  hasReportEvidence,
  orderByAttention,
  periodStart,
  shiftAnchor,
  toDateKey,
} from "../src/features/stats-report/utils/presentation"
import {
  dailyStatsReport,
  emptyStatsReport,
  weeklyStatsReport,
} from "./fixtures/nutritionStatsReports"

describe("nutrition report presentation", () => {
  test("never substitutes an empty meal prompt for actual health warnings", () => {
    expect(hasReportEvidence(emptyStatsReport)).toBe(false)
    expect(
      hasReportEvidence({
        ...emptyStatsReport,
        vitals: dailyStatsReport.vitals,
      }),
    ).toBe(true)
    expect(
      hasReportEvidence({
        ...emptyStatsReport,
        overlapSignals: {
          title: "확인",
          headline: "함께 확인",
          signals: [],
          note: "안내",
        },
      }),
    ).toBe(true)
    expect(hasReportEvidence(weeklyStatsReport)).toBe(true)
  })
  test("retains every nutrient and interpretation, prioritizes attention without mutating the report", () => {
    const original = dailyStatsReport.nutrients!
    const sorted = orderByAttention(original)
    expect(sorted.map((row) => row.key)).toEqual([
      "sodium",
      "phosphorus",
      "potassium",
      "protein",
    ])
    expect(original[0].key).toBe("potassium")
    expect(sorted).toHaveLength(original.length)
    for (const row of original)
      expect(sorted.find((r) => r.key === row.key)).toBe(row)
  })
  test("preserves different over-limit heights and separates missing from zero", () => {
    const day = { day: 1, ratio: 1.1, over: true, empty: false }
    const days = [
      day,
      { ...day, day: 2, ratio: 1.8 },
      { ...day, ratio: 99, empty: true },
    ]
    const scale = chartScale(days)
    expect(scale).toBe(1.8)
    expect(barFraction(day, scale)).toBeCloseTo(1.1 / 1.8)
    expect(barFraction(days[1], scale)).toBe(1)
    expect(barFraction(days[2], scale)).toBeNull()
    expect(barFraction({ ...day, ratio: 0 }, scale)).toBe(0)
    expect(barFraction({ ...day, ratio: NaN }, scale)).toBeNull()
    expect(chartScale([])).toBe(1)
  })
  test("calendar navigation respects month ends, Monday weeks and local dates", () => {
    expect(toDateKey(shiftAnchor("month", new Date(2026, 0, 31), 1))).toBe(
      "2026-02-01",
    )
    expect(toDateKey(periodStart("week", new Date(2026, 8, 6)))).toBe(
      "2026-08-31",
    )
    expect(toDateKey(addDays(new Date(2026, 7, 31), 2))).toBe("2026-09-02")
    const today = new Date(2026, 8, 7)
    expect(periodStart("week", shiftAnchor("week", today, 1)) > today).toBe(
      true,
    )
    expect(periodStart("month", shiftAnchor("month", today, 1)) > today).toBe(
      true,
    )
  })
})

import type {
  BadgeLevel,
  PeriodType,
  StatsReport,
  WeekChartDay,
} from "../types/report"

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
export function mondayOf(date: Date) {
  return addDays(startOfDay(date), -((date.getDay() + 6) % 7))
}
export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
export function periodStart(period: PeriodType, date: Date) {
  if (period === "day") return startOfDay(date)
  if (period === "week") return mondayOf(date)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
export function shiftAnchor(period: PeriodType, date: Date, dir: -1 | 1) {
  if (period === "month")
    return new Date(date.getFullYear(), date.getMonth() + dir, 1)
  return addDays(startOfDay(date), dir * (period === "week" ? 7 : 1))
}
export function fallbackTitle(
  period: PeriodType,
  date: Date,
  language: string,
) {
  const locale = language.startsWith("en") ? "en-US" : "ko-KR"
  if (period === "week") {
    const f = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    })
    return `${f.format(mondayOf(date))} – ${f.format(addDays(mondayOf(date), 6))}`
  }
  return new Intl.DateTimeFormat(
    locale,
    period === "day"
      ? { month: "long", day: "numeric", weekday: "short" }
      : { year: "numeric", month: "long" },
  ).format(date)
}

const PRIORITY: Record<BadgeLevel, number> = {
  DANGER: 0,
  WORSE: 1,
  CAUTION: 2,
  LOW_DATA: 3,
  OK: 4,
  GOOD: 4,
}
export function orderByAttention<T extends { badgeLevel: BadgeLevel }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => PRIORITY[a.badgeLevel] - PRIORITY[b.badgeLevel],
  )
}

// No meals does not mean no health data. A blood-pressure warning must remain visible.
export function hasReportEvidence(report: StatsReport): boolean {
  return (
    report.reliability.mealsRecorded > 0 ||
    [report.nutrients, report.foods, report.vitals, report.averages].some(
      (rows) => (rows?.length ?? 0) > 0,
    ) ||
    !!(
      report.overlapSignals ||
      report.maintainCard ||
      report.weekCharts?.potassium ||
      report.weekCharts?.weight ||
      report.weeklyCompare
    )
  )
}

// Preserve over-limit proportions; 1.1 and 1.8 must not become identical full bars.
export function chartScale(days: WeekChartDay[]) {
  return Math.max(
    1,
    ...days
      .filter((d) => !d.empty && Number.isFinite(d.ratio))
      .map((d) => d.ratio),
  )
}
export function barFraction(day: WeekChartDay, scale: number) {
  return day.empty || !Number.isFinite(day.ratio)
    ? null
    : Math.min(1, Math.max(0, day.ratio) / scale)
}

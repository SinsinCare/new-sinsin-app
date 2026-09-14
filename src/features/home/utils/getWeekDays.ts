import { toDateStr } from "./dateUtils"

export interface WeekDayItem {
  date: Date
  dayOfMonth: number
  hasRecord: boolean
}

/**
 * 기준 날짜가 속한 주의 월~일 7일을 반환
 */
export function getWeekDays(
  baseDate: Date,
  recordedDates: string[] = [],
): WeekDayItem[] {
  const day = baseDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + mondayOffset + i)

    return {
      date: d,
      dayOfMonth: d.getDate(),
      hasRecord: recordedDates.includes(toDateStr(d)),
    }
  })
}

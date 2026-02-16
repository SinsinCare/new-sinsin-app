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
  recordedDates: number[] = [],
): WeekDayItem[] {
  const day = baseDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + mondayOffset + i)

    return {
      date: d,
      dayOfMonth: d.getDate(),
      hasRecord: recordedDates.includes(d.getDate()),
    }
  })
}

export function getWeekLabel(baseDate: Date): string {
  const month = baseDate.getMonth() + 1
  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const weekNumber = Math.ceil((baseDate.getDate() + firstDay.getDay()) / 7)
  return `${month}월 ${weekNumber}주차`
}

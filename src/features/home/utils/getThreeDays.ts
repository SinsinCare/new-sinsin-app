export interface DayItem {
  date: Date
  label: string
  isToday: boolean
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

export type CalendarMode = "record" | "statistics"

export function getThreeDays(
  baseDate = new Date(),
  mode: CalendarMode = "record",
): DayItem[] {
  const days = mode === "statistics" ? [-2, -1, 0] : [-1, 0, 1]

  return days.map((offset) => {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + offset)

    const isToday = offset === 0

    return {
      date: d,
      isToday,
      label: isToday ? "오늘" : DAY_LABELS[d.getDay()],
    }
  })
}

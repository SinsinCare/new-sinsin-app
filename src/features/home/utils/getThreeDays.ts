export interface DayItem {
  date: Date
  label: string
  isToday: boolean
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

export function getThreeDays(baseDate = new Date()): DayItem[] {
  const days = [-1, 0, 1]

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

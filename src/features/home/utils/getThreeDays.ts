export interface DayItem {
  date: Date
  label: string
  isToday: boolean
}

export function getThreeDays(baseDate = new Date()): DayItem[] {
  const days = [-1, 0, 1]

  return days.map((offset) => {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + offset)

    const isToday = offset === 0

    return {
      date: d,
      isToday,
      label: isToday
        ? "오늘"
        : d.getDay() === 0
          ? "일"
          : d.getDay() === 1
            ? "월"
            : d.getDay() === 2
              ? "화"
              : d.getDay() === 3
                ? "수"
                : d.getDay() === 4
                  ? "목"
                  : d.getDay() === 5
                    ? "금"
                    : "토",
    }
  })
}

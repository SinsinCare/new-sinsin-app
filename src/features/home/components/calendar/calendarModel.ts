/** Calendar values are local civil dates, never UTC timestamps. */
export function calendarDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function calendarMonth(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

/** Keep six rows stable when browsing 4-, 5- and 6-week months. Monday first,
 * matching the statistics API's Monday-Sunday week window in both languages. */
export function calendarWeeks(month: Date): (Date | null)[][] {
  const first = calendarMonth(month)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= days
      ? new Date(first.getFullYear(), first.getMonth(), day)
      : null
  })
  return Array.from({ length: 6 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  )
}

export function isFutureCalendarDate(date: Date, today = new Date()): boolean {
  return calendarDateKey(date) > calendarDateKey(today)
}

/** Do not parse YYYY-MM-DD through new Date(): west of UTC it becomes yesterday. */
export function diaryDateKeys(
  items: { date: string; exists: boolean }[],
): Set<string> {
  return new Set(
    items.filter((item) => item.exists).map((item) => item.date.slice(0, 10)),
  )
}

const pad = (n: number) => String(n).padStart(2, "0")

export function getWeekRange(date: Date): {
  startDate: string
  endDate: string
} {
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  return { startDate: fmt(monday), endDate: fmt(sunday) }
}

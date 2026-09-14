import { toDateStr } from "./dateUtils"

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

  return { startDate: toDateStr(monday), endDate: toDateStr(sunday) }
}

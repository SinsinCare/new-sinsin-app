import type { PlanInput, Slot } from "../types"
import { todayKst } from "./medicationModel"

export const validReminderClock = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** Picker dates are only clock carriers; the schedule itself always uses Asia/Seoul. */
export function clockToPickerDate(clock: string): Date {
  const [hour, minute] = (validReminderClock(clock) ? clock : "08:00")
    .split(":")
    .map(Number)
  return new Date(2000, 0, 1, hour, minute)
}
export function pickerDateToClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
export function displayReminderClock(clock: string, locale: string): string {
  if (!validReminderClock(clock)) return ""
  return new Date(`2000-01-01T${clock}:00+09:00`).toLocaleTimeString(locale, {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
export function reminderTimesReady(
  plan: PlanInput,
  confirmed: Slot[],
): boolean {
  return (
    !plan.reminder ||
    (plan.slots.length > 0 &&
      plan.slots.every(
        (slot) =>
          confirmed.includes(slot) &&
          validReminderClock(plan.reminderTimes[slot]),
      ))
  )
}
export function nextMedicationReminder(
  plan: PlanInput,
  now = new Date(),
  taken: Slot[] = [],
) {
  if (!plan.reminder) return null
  const today = todayKst(now)
  const candidates = plan.slots.flatMap((slot) => {
    const clock = plan.reminderTimes[slot]
    if (!validReminderClock(clock)) return []
    const firstDate = plan.startDate > today ? plan.startDate : today
    let at = new Date(`${firstDate}T${clock}:00+09:00`)
    if (at <= now || (firstDate === today && taken.includes(slot)))
      at = new Date(at.getTime() + 86400000)
    return [{ at, slot }]
  })
  return candidates.sort((a, b) => a.at.getTime() - b.at.getTime())[0] ?? null
}

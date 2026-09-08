import { todayKst } from "./medicationModel"
import type { MedicationDay, Plan, Slot } from "../types"
export interface MedicationReminder {
  key: string
  date: string
  at: Date
  slot: Slot
}
/** Calendar dates and slot clocks use Korea time, matching recorded dates. */
export function buildMedicationReminders(
  plans: Plan[],
  day: MedicationDay,
  now = new Date(),
  days = 7,
): MedicationReminder[] {
  const today = todayKst(now),
    groups = new Map<string, MedicationReminder>()
  for (let offset = 0; offset < Math.min(90, Math.max(1, days)); offset++) {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000)
      .toISOString()
      .slice(0, 10)
    for (const plan of plans) {
      if (plan.status !== "ACTIVE" || !plan.reminder || plan.startDate > date)
        continue
      for (const slot of plan.slots) {
        if (
          date === day.date &&
          day.occurrences.some(
            (o) => o.planId === plan.id && o.slot === slot && o.taken,
          )
        )
          continue
        const clock = plan.reminderTimes[slot]
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) continue
        const at = new Date(`${date}T${clock}:00+09:00`)
        if (at.getTime() <= now.getTime()) continue
        const key = `${date}:${clock}:${slot}`
        groups.set(key, { key, date, at, slot })
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.at.getTime() - b.at.getTime())
}

/** Fill the device budget rather than expiring after an arbitrary seven days. */
export function allocateMedicationReminders(
  desired: MedicationReminder[],
  budget: number,
  now = new Date(),
) {
  const room = Math.max(0, Math.floor(budget))
  const selected = desired.slice(0, room > 1 ? room - 1 : room)
  const last = selected.at(-1)
  let renewalAt: Date | null = null
  if (room > 1 && last && last.at.getTime() - now.getTime() > 3600000) {
    // A daytime renewal notice, normally two days before coverage ends.
    const renewalDate = todayKst(new Date(last.at.getTime() - 2 * 86400000))
    const preferred = Date.parse(`${renewalDate}T10:00:00+09:00`)
    renewalAt = new Date(
      Math.min(
        last.at.getTime() - 60000,
        Math.max(now.getTime() + 3600000, preferred),
      ),
    )
  }
  return {
    selected,
    renewalAt,
    coveredUntil: last?.at.toISOString() ?? null,
    limited:
      desired.length > 0 &&
      (!last || last.at.getTime() < now.getTime() + 7 * 86400000),
  }
}

import {
  clockToPickerDate,
  displayReminderClock,
  nextMedicationReminder,
  pickerDateToClock,
  reminderTimesReady,
  validReminderClock,
} from "../src/features/medication/data/medicationReminderTime"
import { createPlanDraft } from "../src/features/medication/data/medicationModel"
import {
  allocateMedicationReminders,
  buildMedicationReminders,
} from "../src/features/medication/data/medicationReminders"
import { routeFromPushData } from "../src/services/notificationRoutingService"
import type { MedicationDay, Plan } from "../src/features/medication/types"
const now = new Date("2026-09-06T00:00:00Z")
const plan: Plan = {
  ...createPlanDraft("2026-09-06"),
  id: "one",
  version: 1,
  status: "ACTIVE",
  drug: null,
  slots: ["BREAKFAST", "DINNER"],
  reminder: true,
}
const day: MedicationDay = {
  date: "2026-09-06",
  today: "2026-09-06",
  revision: "v",
  taken: 0,
  planned: 2,
  legacyTaken: 0,
  occurrences: [],
  plans: [plan],
}
test.each(["00:00", "12:00", "23:59", "08:05"])(
  "native picker round-trips %s without a date or AM/PM shift",
  (clock) => {
    expect(pickerDateToClock(clockToPickerDate(clock))).toBe(clock)
  },
)
test("invalid clock text cannot enter a selected schedule", () => {
  for (const value of ["8:00", "24:00", "12:60", "", undefined])
    expect(validReminderClock(value)).toBe(false)
  expect(
    reminderTimesReady(
      { ...plan, reminderTimes: { ...plan.reminderTimes, DINNER: "24:00" } },
      plan.slots,
    ),
  ).toBe(false)
})
test("default clocks never count as user confirmation; only active dose periods need confirmation", () => {
  expect(reminderTimesReady(plan, [])).toBe(false)
  expect(reminderTimesReady(plan, ["BREAKFAST"])).toBe(false)
  expect(reminderTimesReady(plan, ["BREAKFAST", "DINNER"])).toBe(true)
  expect(
    reminderTimesReady({ ...plan, slots: ["BREAKFAST"] }, ["BREAKFAST"]),
  ).toBe(true)
  expect(reminderTimesReady({ ...plan, slots: [] }, [])).toBe(false)
  expect(reminderTimesReady({ ...plan, reminder: false }, [])).toBe(true)
})
test("preview uses the next future Korea-time dose, including midnight and completed doses", () => {
  expect(nextMedicationReminder(plan, now)?.at.toISOString()).toBe(
    "2026-09-06T09:30:00.000Z",
  )
  expect(nextMedicationReminder(plan, now, ["DINNER"])?.at.toISOString()).toBe(
    "2026-09-06T23:00:00.000Z",
  )
  const midnight = {
    ...plan,
    slots: ["DINNER"] as Plan["slots"],
    reminderTimes: { ...plan.reminderTimes, DINNER: "00:00" },
  }
  expect(
    nextMedicationReminder(
      midnight,
      new Date("2026-09-06T14:59:59Z"),
    )?.at.toISOString(),
  ).toBe("2026-09-06T15:00:00.000Z")
  expect(
    nextMedicationReminder(
      midnight,
      new Date("2026-09-06T15:00:00Z"),
    )?.at.toISOString(),
  ).toBe("2026-09-07T15:00:00.000Z")
  expect(nextMedicationReminder({ ...plan, reminder: false }, now)).toBeNull()
  expect(displayReminderClock("00:00", "ko-KR")).toContain("오전 12:00")
  expect(displayReminderClock("12:00", "ko-KR")).toContain("오후 12:00")
})
test("future start dates are honored and meal instructions never silently move an explicit clock", () => {
  expect(
    nextMedicationReminder(
      { ...plan, startDate: "2026-09-08" },
      now,
    )?.at.toISOString(),
  ).toBe("2026-09-07T23:00:00.000Z")
  expect(nextMedicationReminder({ ...plan, timing: "AFTER_30" }, now)).toEqual(
    nextMedicationReminder(plan, now),
  )
})
test("device capacity extends two daily reminders for weeks and reserves renewal before expiry", () => {
  const desired = buildMedicationReminders([plan], day, now, 90)
  const result = allocateMedicationReminders(desired, 60, now)
  expect(result.selected).toHaveLength(59)
  expect(result.limited).toBe(false)
  expect(Date.parse(result.coveredUntil!)).toBeGreaterThan(
    now.getTime() + 28 * 86400000,
  )
  expect(result.renewalAt!.getTime()).toBeLessThan(
    Date.parse(result.coveredUntil!),
  )
  expect(result.renewalAt!.getTime()).toBeGreaterThan(now.getTime())
  expect(result.selected.every((r, i) => r.key === desired[i]!.key)).toBe(true)
})
test("capacity pressure preserves nearest reminders and never claims full coverage or an absent renewal", () => {
  const desired = buildMedicationReminders([plan], day, now, 90)
  const one = allocateMedicationReminders(desired, 1, now)
  expect(one.selected).toEqual([desired[0]])
  expect(one.limited).toBe(true)
  expect(one.renewalAt).toBeNull()
  const none = allocateMedicationReminders(desired, 0, now)
  expect(none.coveredUntil).toBeNull()
  expect(none.limited).toBe(true)
  expect(allocateMedicationReminders([], 60, now).limited).toBe(false)
})
test("renewal opens management while a late-tapped dose retains its original date", () => {
  const router = { push: jest.fn() }
  expect(
    routeFromPushData({ type: "medication_reminder_renewal" }, router as never),
  ).toBe(true)
  expect(router.push).toHaveBeenLastCalledWith("/medication/manage")
  routeFromPushData(
    { type: "medication_reminder", date: "2026-09-05", slot: "DINNER" },
    router as never,
  )
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: "/record/medication",
    params: { date: "2026-09-05", slot: "DINNER" },
  })
})

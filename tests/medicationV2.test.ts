import { buildMedicationReminders } from "../src/features/medication/data/medicationReminders"
import {
  createPlanDraft,
  validPlanDraft,
  doseChanges,
  firstPendingSlot,
  defaultSlot,
  validMedicationDate,
  rebaseMedicationDraft,
} from "../src/features/medication/data/medicationModel"
import type { MedicationDay, Plan } from "../src/features/medication/types"
const NOW = new Date("2026-09-06T00:00:00Z")
const plan: Plan = {
  ...createPlanDraft("2026-09-06"),
  id: "qa",
  version: 1,
  status: "ACTIVE",
  name: "QA medicine",
  dose: 1,
  slots: ["BREAKFAST", "DINNER"],
  drug: null,
  reminder: true,
}
function day(p = plan): MedicationDay {
  return {
    date: "2026-09-06",
    today: "2026-09-06",
    revision: "v1",
    taken: 0,
    planned: 2,
    legacyTaken: 0,
    plans: [p],
    occurrences: p.slots.map((slot) => ({
      key: `${p.id}:${slot}`,
      planId: p.id,
      slot,
      plan: p,
      taken: false,
      recordedAt: null,
      timeKnown: false,
      historical: false,
    })),
  }
}
describe("Medication v2 draft and dates", () => {
  test("new medicine never assumes a dose, timeslot or consent", () => {
    const initial = createPlanDraft()
    expect(initial.slots).toEqual([])
    expect(initial.dose).toBe(0)
    expect(initial.reminder).toBe(false)
    expect(validPlanDraft(initial, "1", true)).toBe(false)
  })
  test("dose and explicitly selected unit are required", () => {
    expect(validPlanDraft(plan, "1", false)).toBe(false)
    for (const dose of ["", "0", "-1", "text", "1001", "0.0001"])
      expect(validPlanDraft(plan, dose, true)).toBe(false)
    expect(validPlanDraft(plan, "0.5", true)).toBe(true)
  })
  test("malformed clocks and impossible dates cannot be sent", () => {
    expect(
      validPlanDraft(
        { ...plan, reminderTimes: { ...plan.reminderTimes, DINNER: "25:00" } },
        "1",
        true,
      ),
    ).toBe(false)
    expect(validMedicationDate("2026-02-31")).toBe(false)
    expect(validMedicationDate("2028-02-29")).toBe(true)
  })
  test("tab changes never lose unsaved checks and reverted checks disappear from the transaction", () => {
    const base = day()
    expect(
      doseChanges(base, { "qa:BREAKFAST": true, "qa:DINNER": true }),
    ).toHaveLength(2)
    expect(
      doseChanges(base, { "qa:BREAKFAST": false, "qa:DINNER": true }),
    ).toEqual([{ planId: "qa", slot: "DINNER", taken: true }])
  })
  test("a newly added medicine preserves earlier draft checks", () => {
    const before = day(),
      after = day()
    after.occurrences.push({
      ...after.occurrences[0]!,
      key: "new:BREAKFAST",
      planId: "new",
      plan: { ...plan, id: "new" },
    })
    expect(
      rebaseMedicationDraft(before, after, { "qa:BREAKFAST": true }),
    ).toEqual({ "qa:BREAKFAST": true })
  })
  test("remote deletion, dose changes and another saved check require resolution", () => {
    const before = day()
    for (const mutation of ["remove", "version", "taken"]) {
      const after = day()
      if (mutation === "remove") after.occurrences.shift()
      if (mutation === "version")
        after.occurrences[0]!.plan = { ...plan, version: 2 }
      if (mutation === "taken") after.occurrences[0]!.taken = true
      expect(
        rebaseMedicationDraft(before, after, { "qa:BREAKFAST": true }),
      ).toBeNull()
    }
  })
  test("Korea midnight picks bedtime without silently changing explicit record date", () => {
    expect(defaultSlot(new Date("2026-09-05T16:00:00Z"))).toBe("BEDTIME")
    const base = day()
    base.occurrences[0]!.taken = true
    expect(firstPendingSlot(base, "BREAKFAST")).toBe("DINNER")
    expect(base.date).toBe("2026-09-06")
  })
})
describe("Medication reminder planner", () => {
  test("only future, opted-in, active prescriptions create reminders", () => {
    const reminders = buildMedicationReminders(
      [
        plan,
        { ...plan, id: "off", reminder: false },
        { ...plan, id: "paused", status: "PAUSED" },
        { ...plan, id: "deleted", status: "ARCHIVED" },
      ],
      day(),
      NOW,
    )
    expect(reminders).toHaveLength(13)
    expect(reminders.every((r) => r.at > NOW)).toBe(true)
    expect(reminders[0]!.slot).toBe("DINNER")
    expect(reminders.at(-1)!.date).toBe("2026-09-12")
  })
  test("same slot/time groups multiple medications; confirmed doses suppress only their own reminder", () => {
    const second = { ...plan, id: "second" }
    expect(buildMedicationReminders([plan, second], day(), NOW)).toHaveLength(
      13,
    )
    const recorded = day()
    recorded.occurrences[1]!.taken = true
    expect(buildMedicationReminders([plan], recorded, NOW)).toHaveLength(12)
    expect(
      buildMedicationReminders([plan, second], recorded, NOW),
    ).toHaveLength(13)
  })
  test("separately selected times are honored without medicine names in notification descriptors", () => {
    const separate = {
      ...plan,
      id: "other",
      name: "PRIVATE",
      reminderTimes: { ...plan.reminderTimes, DINNER: "20:15" },
    }
    const result = buildMedicationReminders([plan, separate], day(), NOW)
    expect(
      result.find((r) => r.at.toISOString() === "2026-09-06T11:15:00.000Z"),
    ).toBeTruthy()
    expect(JSON.stringify(result)).not.toContain("PRIVATE")
  })
})

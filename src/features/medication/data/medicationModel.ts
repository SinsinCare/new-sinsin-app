import {
  SLOTS,
  type MedicationDay,
  type Plan,
  type PlanInput,
  type Slot,
} from "../types"
export { SLOTS }
export const DEFAULT_TIMES: Record<Slot, string> = {
  BREAKFAST: "08:00",
  LUNCH: "12:30",
  DINNER: "18:30",
  BEDTIME: "22:00",
}
export const todayKst = (now = new Date()) =>
  new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10)
export const validMedicationDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
export function defaultSlot(now = new Date()): Slot {
  const hour = (now.getUTCHours() + 9) % 24
  return hour >= 4 && hour < 11
    ? "BREAKFAST"
    : hour >= 11 && hour < 17
      ? "LUNCH"
      : hour >= 17 && hour < 21
        ? "DINNER"
        : "BEDTIME"
}
/**
 * 홈에서 "오늘" 로 들어왔는데 지금이 새벽 4시 전이면(EX-10) 전날 자기전 약을 연다 —
 * 00:30 에 먹은 자기전 약이 다음 날 기록으로 넘어가면 안 된다. 명시된 날짜가 오늘이 아니거나
 * 슬롯이 명시됐으면 손대지 않는다. `shifted` 는 화면이 그 사실을 알리는 데 쓴다(조용히 바꾸지 않는다).
 */
export function resolveDiaryEntry(
  date: string,
  slot: Slot | undefined,
  now = new Date(),
): { date: string; slot: Slot | undefined; shifted: boolean } {
  const hour = (now.getUTCHours() + 9) % 24
  if (slot !== undefined || date !== todayKst(now) || hour >= 4)
    return { date, slot, shifted: false }
  const previous = new Date(Date.parse(`${date}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10)
  return { date: previous, slot: "BEDTIME", shifted: true }
}
export function firstPendingSlot(
  day: MedicationDay,
  preferred = defaultSlot(),
): Slot {
  const available = (slot: Slot) =>
    day.occurrences.some((o) => o.slot === slot && !o.taken)
  const index = SLOTS.indexOf(preferred)
  return (
    [...SLOTS.slice(index), ...SLOTS.slice(0, index)].find(available) ??
    [...SLOTS.slice(index), ...SLOTS.slice(0, index)].find((slot) =>
      day.occurrences.some((o) => o.slot === slot),
    ) ??
    preferred
  )
}
export type MedicationDraft = Record<string, boolean>
export function doseChanges(day: MedicationDay, draft: MedicationDraft) {
  return day.occurrences
    .filter((o) => draft[o.key] !== undefined && draft[o.key] !== o.taken)
    .map((o) => ({ planId: o.planId, slot: o.slot, taken: draft[o.key]! }))
}
export function createPlanDraft(date = todayKst()): PlanInput {
  return {
    name: "",
    slots: [],
    dose: 0,
    unit: "TABLET",
    timing: "UNSPECIFIED",
    reminder: false,
    reminderTimes: { ...DEFAULT_TIMES },
    startDate: date,
    source: "MANUAL",
    drugId: null,
  }
}
export function validPlanDraft(
  plan: PlanInput,
  doseText: string,
  unitChosen: boolean,
) {
  const dose = Number(doseText.replace(",", "."))
  return (
    !!plan.name.trim() &&
    plan.name.trim().length <= 120 &&
    plan.slots.length > 0 &&
    !!doseText.trim() &&
    Number.isFinite(dose) &&
    dose > 0 &&
    dose <= 1000 &&
    Math.abs(dose * 1000 - Math.round(dose * 1000)) < 0.00001 &&
    unitChosen &&
    validMedicationDate(plan.startDate) &&
    plan.startDate <= todayKst() &&
    SLOTS.every((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(plan.reminderTimes[s]))
  )
}
export const doseKey = (id: string, slot: Slot) => `${id}:${slot}`
export const planInput = (plan: Plan): PlanInput => ({
  name: plan.name,
  slots: plan.slots,
  dose: plan.dose,
  unit: plan.unit,
  timing: plan.timing,
  reminder: plan.reminder,
  reminderTimes: plan.reminderTimes,
  startDate: plan.startDate,
  source: plan.source,
  drugId: plan.drugId,
})

/** Preserve checks across an added medicine; never reinterpret an edited/removed dose silently. */
export function rebaseMedicationDraft(
  before: MedicationDay,
  after: MedicationDay,
  draft: MedicationDraft,
): MedicationDraft | null {
  const changes = doseChanges(before, draft),
    next: MedicationDraft = {}
  for (const change of changes) {
    const key = doseKey(change.planId, change.slot),
      old = before.occurrences.find((o) => o.key === key),
      current = after.occurrences.find((o) => o.key === key)
    if (
      !old ||
      !current ||
      old.taken !== current.taken ||
      old.plan.version !== current.plan.version
    )
      return null
    next[key] = change.taken
  }
  return next
}

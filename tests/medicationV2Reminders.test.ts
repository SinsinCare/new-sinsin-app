import {
  cancelMedicationReminders,
  syncMedicationReminders,
} from "../src/features/medication/services/medicationReminders"
import { useMedicationReminderStore } from "../src/features/medication/stores/medicationReminderStore"
import { createPlanDraft } from "../src/features/medication/data/medicationModel"
import type { MedicationDay, Plan } from "../src/features/medication/types"
let mockUid = "qa",
  mockPermission = true
const mockScheduled = new Map<string, unknown>(),
  mockCancel = jest.fn(async (id: string) => {
    mockScheduled.delete(id)
  }),
  mockSchedule = jest.fn(async (r: { identifier: string }) => {
    mockScheduled.set(r.identifier, r)
    return r.identifier
  })
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))
jest.mock("expo-notifications", () => ({
  getAllScheduledNotificationsAsync: async () =>
    [...mockScheduled.keys()].map((identifier) => ({ identifier })),
  cancelScheduledNotificationAsync: (id: string) => mockCancel(id),
  scheduleNotificationAsync: (r: { identifier: string }) => mockSchedule(r),
  getPermissionsAsync: async () => ({ granted: mockPermission }),
  SchedulableTriggerInputTypes: { DATE: "date" },
}))
jest.mock("../src/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}))
jest.mock("../src/stores/authStore", () => ({
  useAuthStore: { getState: () => ({ user: { uid: mockUid } }) },
}))
const mockPlans = jest.fn(),
  mockDay = jest.fn()
jest.mock("../src/features/medication/services/medicationApi", () => ({
  medicationApi: { plans: () => mockPlans(), day: () => mockDay() },
}))
const plan: Plan = {
  ...createPlanDraft("2026-09-06"),
  id: "qa",
  version: 1,
  status: "ACTIVE",
  name: "PRIVATE MEDICINE",
  dose: 1,
  slots: ["DINNER"],
  drug: null,
  reminder: true,
}
const day: MedicationDay = {
  date: "2026-09-06",
  today: "2026-09-06",
  revision: "x",
  taken: 0,
  planned: 1,
  legacyTaken: 0,
  plans: [plan],
  occurrences: [],
}
beforeEach(async () => {
  await cancelMedicationReminders()
  jest.clearAllMocks()
  mockScheduled.clear()
  mockScheduled.set("morning-check", {})
  mockUid = "qa"
  mockPermission = true
  mockPlans.mockResolvedValue([plan])
  mockDay.mockResolvedValue(day)
  jest.useFakeTimers({ doNotFake: ["nextTick", "queueMicrotask"] })
  jest.setSystemTime(new Date("2026-09-06T00:00:00Z"))
})
afterEach(() => jest.useRealTimers())
test("sync twice replaces stable IDs and never leaks a medicine name", async () => {
  expect(await syncMedicationReminders("qa")).toBe(true)
  expect(await syncMedicationReminders("qa")).toBe(true)
  expect(mockScheduled.size).toBe(60)
  expect(mockScheduled.has("morning-check")).toBe(true)
  expect(JSON.stringify(mockSchedule.mock.calls)).not.toContain(
    "PRIVATE MEDICINE",
  )
  expect(mockCancel).not.toHaveBeenCalledWith("morning-check")
})
test("revoked permission cancels only medication reservations and reports failure", async () => {
  await syncMedicationReminders("qa")
  mockPermission = false
  expect(await syncMedicationReminders("qa")).toBe(false)
  expect([...mockScheduled.keys()]).toEqual(["morning-check"])
})
test("device capacity never silently reports every reminder scheduled", async () => {
  for (let i = 0; i < 58; i++) mockScheduled.set(`other-${i}`, {})
  expect(await syncMedicationReminders("qa")).toBe(false)
  expect(mockScheduled.size).toBe(60)
})
test("logout while a server read is pending prevents stale scheduling", async () => {
  let resolve!: (p: Plan[]) => void
  mockPlans.mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const pending = syncMedicationReminders("qa")
  await Promise.resolve()
  await Promise.resolve()
  mockUid = ""
  const cancel = cancelMedicationReminders()
  resolve([plan])
  await pending
  await cancel
  expect(mockSchedule).not.toHaveBeenCalled()
  expect([...mockScheduled.keys()]).toEqual(["morning-check"])
})
test("a scheduler error propagates; a retry remains usable", async () => {
  mockSchedule.mockRejectedValueOnce(new Error("scheduler failed"))
  await expect(syncMedicationReminders("qa")).rejects.toThrow(
    "scheduler failed",
  )
  expect(useMedicationReminderStore.getState().problem).toBe(true)
  expect(await syncMedicationReminders("qa")).toBe(true)
  expect(useMedicationReminderStore.getState().problem).toBe(false)
})

test("coverage reflects actual registered reminders beyond seven days and includes renewal", async () => {
  await syncMedicationReminders("qa")
  const state = useMedicationReminderStore.getState()
  expect(Date.parse(state.coveredUntil!)).toBeGreaterThan(
    Date.now() + 50 * 86400000,
  )
  expect(state.renewalAt).not.toBeNull()
  expect(mockScheduled.has("medication-v2:qa:renewal")).toBe(true)
})
test("a completed dose cancels today only; pausing cancels its future reminders and renewal", async () => {
  await syncMedicationReminders("qa")
  const todayId = "medication-v2:qa:2026-09-06:18:30:DINNER"
  expect(mockScheduled.has(todayId)).toBe(true)
  mockDay.mockResolvedValue({
    ...day,
    occurrences: [{ planId: plan.id, slot: "DINNER", taken: true }],
  })
  await syncMedicationReminders("qa")
  expect(mockScheduled.has(todayId)).toBe(false)
  expect(mockScheduled.has("medication-v2:qa:2026-09-07:18:30:DINNER")).toBe(
    true,
  )
  mockPlans.mockResolvedValue([{ ...plan, status: "PAUSED" }])
  await syncMedicationReminders("qa")
  expect([...mockScheduled.keys()]).toEqual(["morning-check"])
  expect(useMedicationReminderStore.getState().coveredUntil).toBeNull()
})
test("changing a clock removes the old time before registering the new one", async () => {
  await syncMedicationReminders("qa")
  mockPlans.mockResolvedValue([
    { ...plan, reminderTimes: { ...plan.reminderTimes, DINNER: "20:15" } },
  ])
  await syncMedicationReminders("qa")
  expect([...mockScheduled.keys()].some((id) => id.includes(":18:30:"))).toBe(
    false,
  )
  expect(mockScheduled.has("medication-v2:qa:2026-09-06:20:15:DINNER")).toBe(
    true,
  )
})
test("native silent registration loss reports failure rather than invented coverage", async () => {
  mockSchedule.mockImplementationOnce(async (r) => r.identifier)
  await expect(syncMedicationReminders("qa")).rejects.toThrow(
    "registration incomplete",
  )
  expect(useMedicationReminderStore.getState().problem).toBe(true)
})

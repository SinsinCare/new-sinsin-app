import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useMedicationDiary } from "../src/features/medication/hooks/useMedicationDiary"
import { createPlanDraft } from "../src/features/medication/data/medicationModel"
import type { MedicationDay, Plan } from "../src/features/medication/types"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("@react-navigation/native", () => ({ useFocusEffect: jest.fn() }))
const mockT = (key: string) => key
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }))
jest.mock("expo-modules-core", () => ({
  uuid: { v4: () => `request-${++mockSequence}` },
}))
let mockSequence = 0,
  mockUser = "qa"
const mockLeave = jest.fn(),
  mockSave = jest.fn(),
  mockRefetch = jest.fn(),
  mockCache = {
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
  }
let mockQuery: {
  data: MedicationDay | undefined
  isError: boolean
  refetch: typeof mockRefetch
}
let mockGuard: { hasChanges: boolean; isSaving: boolean }
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockQuery,
  useQueryClient: () => mockCache,
}))
jest.mock("../src/stores/authStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { uid: mockUser } }),
}))
jest.mock("../src/features/medication/services/medicationApi", () => ({
  medicationApi: { saveDay: (...args: unknown[]) => mockSave(...args) },
  isMedicationConflict: (e: { status?: number }) => e.status === 409,
}))
jest.mock("../src/features/medication/services/medicationReminders", () => ({
  syncMedicationReminders: jest.fn().mockResolvedValue(true),
}))
jest.mock("../src/features/medication/stores/medicationFlowStore", () => ({
  useMedicationFlowStore: { getState: () => ({ addedSlot: null }) },
}))
jest.mock("../src/features/home/hooks/useHealthEntryInput", () => ({
  useHealthEntryInput: () => jest.fn(),
}))
jest.mock("../src/features/home/hooks/useRecordSaveFeedback", () => ({
  useRecordSaveFeedback: () => ({
    isSaving: false,
    saved: false,
    reset: jest.fn(),
    run: (fn: () => Promise<boolean>) => fn(),
  }),
}))
jest.mock("../src/features/home/hooks/useRecordExitGuard", () => ({
  useRecordExitGuard: (props: typeof mockGuard) => {
    mockGuard = props
    return { leaveAfterSave: mockLeave }
  },
}))
jest.mock("../src/lib/dialog", () => ({
  showConfirm: jest.fn().mockResolvedValue(true),
}))
const plan: Plan = {
  ...createPlanDraft("2026-09-06"),
  name: "QA",
  dose: 1,
  slots: ["BREAKFAST", "DINNER"],
  id: "medicine",
  version: 1,
  status: "ACTIVE",
  drug: null,
}
function base(): MedicationDay {
  return {
    date: "2026-09-06",
    today: "2026-09-06",
    revision: "initial",
    taken: 0,
    planned: 2,
    legacyTaken: 0,
    plans: [plan],
    occurrences: plan.slots.map((slot) => ({
      key: `medicine:${slot}`,
      planId: plan.id,
      slot,
      plan,
      taken: false,
      recordedAt: null,
      timeKnown: false,
      historical: false,
    })),
  }
}
beforeEach(() => {
  jest.clearAllMocks()
  mockUser = "qa"
  mockSequence = 0
  mockQuery = { data: base(), isError: false, refetch: mockRefetch }
})
const setup = () =>
  renderHookWithEffects(() =>
    useMedicationDiary("2026-09-06", jest.fn(), "BREAKFAST"),
  )
test("failed save retains cross-tab checks and retries with the identical idempotency key", async () => {
  const hook = setup()
  hook.result().toggle("medicine:BREAKFAST")
  hook.result().setSlot("DINNER")
  hook.result().toggleAll()
  expect(mockGuard.hasChanges).toBe(true)
  mockSave.mockRejectedValueOnce(new Error("network"))
  await hook.result().submit()
  expect(mockLeave).not.toHaveBeenCalled()
  expect(hook.result().changes).toBe(2)
  expect(hook.result().error).toBe("saveError")
  const first = mockSave.mock.calls[0]
  mockSave.mockResolvedValueOnce({
    ...base(),
    revision: "saved",
    taken: 2,
    occurrences: base().occurrences.map((o) => ({ ...o, taken: true })),
  })
  await hook.result().submit()
  expect(mockSave.mock.calls[1]).toEqual(first)
  expect(mockLeave).toHaveBeenCalledTimes(1)
  expect(hook.result().dirty).toBe(false)
  hook.unmount()
})
test("editing a failed request generates a new key; reverting every check disables the transaction", async () => {
  const hook = setup()
  hook.result().toggle("medicine:BREAKFAST")
  mockSave.mockRejectedValue(new Error("network"))
  await hook.result().submit()
  hook.result().toggle("medicine:DINNER")
  await hook.result().submit()
  expect(mockSave.mock.calls[0][3]).not.toBe(mockSave.mock.calls[1][3])
  hook.result().toggle("medicine:BREAKFAST")
  hook.result().toggle("medicine:DINNER")
  expect(hook.result().dirty).toBe(false)
  hook.unmount()
})
test("conflict keeps the draft until the user chooses a fresh copy", async () => {
  const hook = setup()
  hook.result().toggle("medicine:BREAKFAST")
  mockSave.mockRejectedValue({ status: 409 })
  await hook.result().submit()
  expect(hook.result().conflict).toBe(true)
  expect(hook.result().dirty).toBe(true)
  mockRefetch.mockResolvedValue({ data: { ...base(), revision: "remote" } })
  await hook.result().reload()
  expect(hook.result().dirty).toBe(false)
  expect(hook.result().base?.revision).toBe("remote")
  hook.unmount()
})
test("late save cannot navigate or replace caches after the page is gone", async () => {
  let finish!: (value: MedicationDay) => void
  mockSave.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const hook = setup()
  hook.result().toggle("medicine:BREAKFAST")
  const pending = hook.result().submit()
  hook.unmount()
  finish({ ...base(), revision: "late" })
  await pending
  expect(mockLeave).not.toHaveBeenCalled()
  expect(mockCache.setQueryData).not.toHaveBeenCalled()
})

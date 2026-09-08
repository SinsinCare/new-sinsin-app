import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useMedicationReminderPermission } from "../src/features/medication/hooks/useMedicationReminderPermission"
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
const mockRead = jest.fn(),
  mockRequest = jest.fn(),
  mockOpen = jest.fn(),
  mockRemove = jest.fn()
let mockResume: (state: string) => void
jest.mock("react-native", () => ({
  Linking: { openSettings: () => mockOpen() },
  AppState: {
    addEventListener: (_: string, callback: typeof mockResume) => {
      mockResume = callback
      return { remove: mockRemove }
    },
  },
}))
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockRead(),
  requestPermissionsAsync: () => mockRequest(),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}))
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
beforeEach(() => {
  jest.clearAllMocks()
  mockRead.mockResolvedValue({ granted: false, canAskAgain: true })
})
test("opening the form only reads permission; saving asks once and resumes cleanly after denial", async () => {
  const hook = renderHookWithEffects(useMedicationReminderPermission)
  await flush()
  expect(hook.result().permission).toBe("ask")
  expect(mockRequest).not.toHaveBeenCalled()
  mockRequest.mockResolvedValue({ granted: false, canAskAgain: false })
  expect(await hook.result().ensure()).toBe(false)
  expect(hook.result().permission).toBe("blocked")
  hook.result().openSettings()
  expect(mockOpen).toHaveBeenCalledTimes(1)
  mockRead.mockResolvedValue({ granted: true })
  mockResume("active")
  await flush()
  expect(hook.result().permission).toBe("allowed")
  expect(await hook.result().ensure()).toBe(true)
  expect(mockRequest).toHaveBeenCalledTimes(1)
  hook.unmount()
  expect(mockRemove).toHaveBeenCalledTimes(1)
})
test("blocked permission does not repeatedly open a system prompt", async () => {
  mockRead.mockResolvedValue({ granted: false, canAskAgain: false })
  const hook = renderHookWithEffects(useMedicationReminderPermission)
  await flush()
  expect(await hook.result().ensure()).toBe(false)
  expect(mockRequest).not.toHaveBeenCalled()
  hook.unmount()
})
test("provisional notifications are labelled quiet and errors release the pending lock", async () => {
  mockRead.mockResolvedValue({ granted: false, ios: { status: 3 } })
  const hook = renderHookWithEffects(useMedicationReminderPermission)
  await flush()
  expect(hook.result().permission).toBe("quiet")
  expect(await hook.result().ensure()).toBe(true)
  mockRead.mockRejectedValue(new Error("unavailable"))
  mockRequest.mockRejectedValue(new Error("unavailable"))
  expect(await hook.result().ensure()).toBe(false)
  expect(hook.result().busy).toBe(false)
  mockRead.mockResolvedValue({ granted: true })
  expect(await hook.result().ensure()).toBe(true)
  hook.unmount()
})

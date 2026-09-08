import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { DEFAULT_NOTIFICATION_SETTINGS } from "../src/types/notification"
import { useNotifications } from "../src/hooks/useNotifications"
import { notificationSettingsService } from "../src/services/data/notificationSettingsService"
import { notificationService } from "../src/services/notificationService"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("react-native", () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}))
jest.mock("../src/services/data/notificationSettingsService", () => ({
  notificationSettingsService: {
    get: jest.fn(),
    update: jest.fn(),
    setPushConsent: jest.fn(),
  },
}))
jest.mock("../src/services/notificationService", () => ({
  notificationService: {
    hasPermission: jest.fn(),
    scheduleAll: jest.fn(),
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn(),
    requestPermissions: jest.fn(),
    cancelAll: jest.fn(),
  },
}))
const api = jest.mocked(notificationSettingsService)
const notifications = jest.mocked(notificationService)
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

beforeEach(() => {
  jest.clearAllMocks()
  api.get.mockResolvedValue(DEFAULT_NOTIFICATION_SETTINGS)
  notifications.hasPermission.mockResolvedValue(true)
  notifications.scheduleAll.mockResolvedValue(undefined)
  notifications.cancelAll.mockResolvedValue(undefined)
})

test("opening settings only reads consent and becomes ready after the response", async () => {
  const read = deferred<typeof DEFAULT_NOTIFICATION_SETTINGS>()
  api.get.mockReturnValueOnce(read.promise)
  const hook = renderHookWithEffects(() => useNotifications(true))
  expect(hook.result().isReady).toBe(false)
  read.resolve(DEFAULT_NOTIFICATION_SETTINGS)
  await flush()
  expect(hook.result().isReady).toBe(true)
  expect(api.update).not.toHaveBeenCalled()
  expect(api.setPushConsent).not.toHaveBeenCalled()
  hook.unmount()
})

test("failed read exposes retry and never presents defaults as editable consent", async () => {
  api.get.mockRejectedValueOnce(new Error("offline"))
  const hook = renderHookWithEffects(() => useNotifications(true))
  await flush()
  expect(hook.result().isReady).toBe(false)
  expect(hook.result().error).toBeInstanceOf(Error)
  await hook.result().retry()
  expect(hook.result().isReady).toBe(true)
  expect(hook.result().error).toBeNull()
  hook.unmount()
})

test("failed marketing save preserves the server-confirmed value", async () => {
  const hook = renderHookWithEffects(() => useNotifications(true))
  await flush()
  api.update.mockRejectedValueOnce(new Error("offline"))
  const next = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    categories: {
      ...DEFAULT_NOTIFICATION_SETTINGS.categories,
      marketing: { enabled: true },
    },
  }
  await expect(hook.result().updateSettings(next)).rejects.toThrow("offline")
  expect(hook.result().settings.categories.marketing.enabled).toBe(
    DEFAULT_NOTIFICATION_SETTINGS.categories.marketing.enabled,
  )
  hook.unmount()
})

test("a slow pre-save refresh cannot overwrite the saved preference", async () => {
  const hook = renderHookWithEffects(() => useNotifications(true))
  await flush()
  const oldRead = deferred<typeof DEFAULT_NOTIFICATION_SETTINGS>()
  api.get.mockReturnValueOnce(oldRead.promise)
  const refresh = hook.result().retry()
  api.update.mockResolvedValueOnce(undefined)
  const next = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    categories: {
      ...DEFAULT_NOTIFICATION_SETTINGS.categories,
      marketing: { enabled: true },
    },
  }
  await hook.result().updateSettings(next)
  oldRead.resolve(DEFAULT_NOTIFICATION_SETTINGS)
  await refresh
  expect(hook.result().settings.categories.marketing.enabled).toBe(true)
  hook.unmount()
})

test("OS permission refusal never writes push consent", async () => {
  const hook = renderHookWithEffects(() => useNotifications(true))
  await flush()
  notifications.requestPermissions.mockResolvedValueOnce(false)
  expect(await hook.result().setPushConsent(true)).toBe(false)
  expect(api.setPushConsent).not.toHaveBeenCalled()
  hook.unmount()
})

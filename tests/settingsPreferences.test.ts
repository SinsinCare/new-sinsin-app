import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useSettingsScreen } from "../src/features/settings/hooks/useSettingsScreen"
import { DEFAULT_NOTIFICATION_SETTINGS } from "../src/types/notification"
import { setAppLanguage } from "../src/i18n"

let mockLanguage = "ko"
const mockSetTheme = jest.fn()
const mockUpdate = jest.fn()
const mockPush = jest.fn()
const mockNotify = {
  settings: DEFAULT_NOTIFICATION_SETTINGS,
  updateSettings: mockUpdate,
  pushEnabled: false,
  setPushConsent: mockPush,
  isReady: true,
  error: null,
  retry: jest.fn(),
}
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./helpers/effectHookHarness"),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ signOut: jest.fn(), isAuthenticated: true }),
}))
jest.mock("../src/hooks/useNotifications", () => ({
  useNotifications: () => mockNotify,
}))
jest.mock("../src/stores/themeStore", () => ({
  useThemeStore: () => ({ themeMode: "light", setThemeMode: mockSetTheme }),
}))
jest.mock("../src/i18n", () => ({
  getAppLanguage: () => mockLanguage,
  setAppLanguage: jest.fn(),
}))
jest.mock("../src/services/notificationService", () => ({
  notificationService: { scheduleAll: jest.fn(), registerPushToken: jest.fn() },
}))
jest.mock("../src/lib/toast", () => ({ showErrorToast: jest.fn() }))
jest.mock("../src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("../src/features/settings/utils/openAppSettings", () => ({
  showOpenSettingsAlert: jest.fn(),
}))
jest.mock("../src/shared/components/appModalGate", () => ({
  afterModalTransitions: jest.fn(),
}))
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
beforeEach(() => {
  jest.clearAllMocks()
  mockLanguage = "ko"
  mockNotify.isReady = true
})

test("visiting settings does not write theme, language or consent", () => {
  const h = renderHookWithEffects(useSettingsScreen)
  expect(mockSetTheme).not.toHaveBeenCalled()
  expect(setAppLanguage).not.toHaveBeenCalled()
  expect(mockUpdate).not.toHaveBeenCalled()
  expect(mockPush).not.toHaveBeenCalled()
  h.unmount()
})
test("language persistence failure keeps the selection open and releases its lock", async () => {
  jest.mocked(setAppLanguage).mockRejectedValueOnce(new Error("disk"))
  const h = renderHookWithEffects(useSettingsScreen)
  expect(await h.result().handleLanguageChange("en")).toBe(false)
  expect(h.result().currentLanguage).toBe("ko")
  expect(h.result().languageChanging).toBe(false)
  h.unmount()
})
test("rapid different consent toggles cannot race full settings writes", async () => {
  const pending = deferred()
  mockUpdate.mockReturnValueOnce(pending.promise)
  const h = renderHookWithEffects(useSettingsScreen)
  const save = h.result().handleMarketingToggle(true)
  expect(h.result().notificationDisabled).toBe(true)
  await h.result().handlePushToggle(true)
  expect(mockPush).not.toHaveBeenCalled()
  pending.resolve()
  await save
  expect(h.result().notificationDisabled).toBe(false)
  h.unmount()
})
test("unloaded consent is not writable", async () => {
  mockNotify.isReady = false
  const h = renderHookWithEffects(useSettingsScreen)
  await h.result().handleMarketingToggle(true)
  await h.result().handlePushToggle(true)
  expect(mockUpdate).not.toHaveBeenCalled()
  expect(mockPush).not.toHaveBeenCalled()
  h.unmount()
})

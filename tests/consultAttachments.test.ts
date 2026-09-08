/* eslint-disable import/first */
import { renderHookWithEffects } from "./helpers/effectHookHarness"
const mockLibrary = jest.fn()
const mockCamera = jest.fn()
const mockPermission = jest.fn()
const mockLibraryPermission = jest.fn()
const mockSettings = jest.fn()
const mockConfirm = jest.fn()
const mockVisible = jest.fn(() => false)
const mockDimensions = jest.fn().mockReturnValue({ remove: jest.fn() })
jest.mock("react", () => require("./helpers/effectHookHarness"))
jest.mock("react-native", () => ({
  Keyboard: { isVisible: () => mockVisible() },
  Linking: { openSettings: () => mockSettings() },
  Dimensions: {
    addEventListener: (...args: unknown[]) => mockDimensions(...args),
  },
}))
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLibrary(...args),
  launchCameraAsync: (...args: unknown[]) => mockCamera(...args),
  requestCameraPermissionsAsync: () => mockPermission(),
  requestMediaLibraryPermissionsAsync: () => mockLibraryPermission(),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/lib/dialog", () => ({
  showConfirm: (...args: unknown[]) => mockConfirm(...args),
}))
import { useConsultAttachments } from "../src/features/consultation/hooks/useConsultAttachments"
const photo = (uri: string) => ({ canceled: false, assets: [{ uri }] })
const setup = () => {
  const restoreFocus = jest.fn()
  return {
    restoreFocus,
    hook: renderHookWithEffects(() =>
      useConsultAttachments({ topInset: 60, restoreFocus }),
    ),
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
beforeEach(() => {
  jest.clearAllMocks()
  mockVisible.mockReturnValue(false)
  mockLibrary.mockResolvedValue(photo("file://owned-test.png"))
  mockCamera.mockResolvedValue(photo("file://camera-test.png"))
  mockPermission.mockResolvedValue({ status: "granted" })
  mockSettings.mockResolvedValue(undefined)
  mockConfirm.mockResolvedValue(false)
})

test("system library picker keeps a local attachment without asking for the entire library", async () => {
  const { hook } = setup()
  await hook.result().handlePhotoUpload()
  expect(mockLibraryPermission).not.toHaveBeenCalled()
  expect(mockLibrary).toHaveBeenCalledWith({
    mediaTypes: ["images"],
    quality: 0.8,
  })
  expect(hook.result().attachedImageUri).toBe("file://owned-test.png")
  expect(hook.result().isPickingPhoto).toBe(false)
  hook.unmount()
})

test("canceling a replacement keeps the prior attachment and has no failure state", async () => {
  const { hook } = setup()
  await hook.result().handlePhotoUpload()
  mockLibrary.mockResolvedValue({ canceled: true, assets: null })
  await hook.result().handlePhotoUpload()
  expect(hook.result().attachedImageUri).toBe("file://owned-test.png")
  expect(hook.result().attachmentError).toBeNull()
  hook.unmount()
})

test("a failed picker preserves the old photo and retry uses the failed source", async () => {
  const { hook } = setup()
  await hook.result().handlePhotoUpload()
  mockCamera.mockRejectedValueOnce(new Error("native private detail"))
  await hook.result().handleCameraUpload()
  expect(hook.result().attachedImageUri).toBe("file://owned-test.png")
  expect(hook.result().attachmentError).toEqual({
    source: "camera",
    settings: false,
  })
  await hook.result().retryAttachment()
  expect(hook.result().attachedImageUri).toBe("file://camera-test.png")
  expect(hook.result().attachmentError).toBeNull()
  hook.unmount()
})

test("rapid photo and camera actions open only one native picker", async () => {
  const result = deferred<ReturnType<typeof photo>>()
  mockLibrary.mockReturnValue(result.promise)
  const { hook } = setup()
  const pending = hook.result().handlePhotoUpload()
  await hook.result().handlePhotoUpload()
  await hook.result().handleCameraUpload()
  expect(mockLibrary).toHaveBeenCalledTimes(1)
  expect(mockPermission).not.toHaveBeenCalled()
  expect(hook.result().isPickingPhoto).toBe(true)
  result.resolve(photo("file://one.png"))
  await pending
  expect(hook.result().isPickingPhoto).toBe(false)
  hook.unmount()
})

test("clearing or switching the draft invalidates late selection and focus", async () => {
  const result = deferred<ReturnType<typeof photo>>()
  mockLibrary.mockReturnValue(result.promise)
  mockVisible.mockReturnValue(true)
  const { hook, restoreFocus } = setup()
  const pending = hook.result().handlePhotoUpload()
  hook.result().clearAttachedImage()
  result.resolve(photo("file://stale.png"))
  await pending
  expect(hook.result().attachedImageUri).toBeNull()
  expect(hook.result().attachmentError).toBeNull()
  expect(restoreFocus).not.toHaveBeenCalled()
  hook.unmount()
})

test("a picker rejection after unmount causes no render, prompt or focus", async () => {
  const result = deferred<ReturnType<typeof photo>>()
  mockLibrary.mockReturnValue(result.promise)
  mockVisible.mockReturnValue(true)
  const { hook, restoreFocus } = setup()
  const pending = hook.result().handlePhotoUpload()
  hook.unmount()
  const renders = hook.renderCount()
  result.reject(new Error("late native rejection"))
  await pending
  expect(hook.renderCount()).toBe(renders)
  expect(mockConfirm).not.toHaveBeenCalled()
  expect(restoreFocus).not.toHaveBeenCalled()
})

test("denied camera access can be canceled without opening settings or camera", async () => {
  mockPermission.mockResolvedValue({ status: "denied" })
  const { hook } = setup()
  await hook.result().handleCameraUpload()
  expect(mockConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ confirmLabel: "consult.openSettings" }),
  )
  expect(mockSettings).not.toHaveBeenCalled()
  expect(mockCamera).not.toHaveBeenCalled()
  expect(hook.result().attachmentError).toBeNull()
  hook.unmount()
})

test("settings failure has a settings retry instead of reopening the camera", async () => {
  mockPermission.mockResolvedValue({ status: "denied" })
  mockConfirm.mockResolvedValue(true)
  mockSettings.mockRejectedValueOnce(new Error("settings failed"))
  const { hook } = setup()
  await hook.result().handleCameraUpload()
  expect(hook.result().attachmentError).toEqual({
    source: "camera",
    settings: true,
  })
  await hook.result().retryAttachment()
  expect(mockSettings).toHaveBeenCalledTimes(2)
  expect(mockPermission).toHaveBeenCalledTimes(1)
  expect(mockCamera).not.toHaveBeenCalled()
  hook.unmount()
})

test("a late permission dialog cannot launch settings after the draft resets", async () => {
  const confirmation = deferred<boolean>()
  mockPermission.mockResolvedValue({ status: "denied" })
  mockConfirm.mockReturnValue(confirmation.promise)
  const { hook } = setup()
  const pending = hook.result().handleCameraUpload()
  await Promise.resolve()
  hook.result().clearAttachedImage()
  confirmation.resolve(true)
  await pending
  expect(mockSettings).not.toHaveBeenCalled()
  hook.unmount()
})

test("picker return restores only a previously visible keyboard", async () => {
  const { hook, restoreFocus } = setup()
  await hook.result().handlePhotoUpload()
  expect(restoreFocus).not.toHaveBeenCalled()
  mockVisible.mockReturnValue(true)
  await hook.result().handlePhotoUpload()
  expect(restoreFocus).toHaveBeenCalledTimes(1)
  hook.unmount()
})

test("menu anchors above the whole field in root coordinates and ignores a canceled measurement", () => {
  const { hook } = setup()
  let measureButton: (...args: number[]) => void = () => {}
  hook.result().attachmentRootRef.current = {
    measureInWindow: (callback: (...args: number[]) => void) =>
      callback(0, 30, 400, 840),
  } as never
  hook.result().attachmentAnchorRef.current = {
    measureInWindow: (callback: (...args: number[]) => void) => {
      measureButton = callback
    },
  } as never
  hook.result().handlePlusPress()
  measureButton(20, 700, 44, 44)
  expect(hook.result().attachMenuPosition).toEqual({
    bottom: 178,
    maxHeight: 590,
  })
  expect(hook.result().attachMenuOpen).toBe(true)
  hook.result().closeAttachMenu()
  hook.result().handlePlusPress()
  hook.result().closeAttachMenu()
  measureButton(20, 710, 44, 44)
  expect(hook.result().attachMenuOpen).toBe(false)
  hook.unmount()
})

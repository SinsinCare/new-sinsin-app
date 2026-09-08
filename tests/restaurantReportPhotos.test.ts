import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useRestaurantReportPhotos } from "../src/features/restaurant/hooks/useRestaurantReportPhotos"
import * as Picker from "expo-image-picker"
import { Linking } from "react-native"
import { showConfirm } from "@/src/lib/dialog"
jest.mock("react", () => {
  const h = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...jest.requireActual("react"),
    useState: h.useState,
    useRef: h.useRef,
    useEffect: h.useEffect,
    useCallback: h.useCallback,
  }
})
jest.mock("react-native", () => ({ Linking: { openSettings: jest.fn() } }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))
jest.mock("@/src/lib/dialog", () => ({ showConfirm: jest.fn() }))
jest.mock("@/src/shared/components/appModalGate", () => ({
  afterModalTransitions: jest.fn().mockResolvedValue(undefined),
}))
const permission = jest.mocked(Picker.requestMediaLibraryPermissionsAsync)
const picker = jest.mocked(Picker.launchImageLibraryAsync)
const granted = {
  status: "granted",
  granted: true,
  canAskAgain: true,
  expires: "never",
} as Picker.MediaLibraryPermissionResponse
const asset = (uri: string, assetId = uri): Picker.ImagePickerAsset => ({
  uri,
  assetId,
  width: 100,
  height: 100,
})
const result = (
  ...assets: Picker.ImagePickerAsset[]
): Picker.ImagePickerResult => ({ canceled: false, assets })
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
function mount() {
  const error = jest.fn()
  return {
    ...renderHookWithEffects(() => useRestaurantReportPhotos(error)),
    error,
  }
}
beforeEach(() => {
  jest.clearAllMocks()
  permission.mockResolvedValue(granted)
  picker.mockResolvedValue({ canceled: true, assets: null })
})
it("locks double taps before permission completes and releases after cancellation", async () => {
  const p = deferred<Picker.MediaLibraryPermissionResponse>()
  permission.mockReturnValueOnce(p.promise)
  const h = mount()
  const first = h.result().addPhotos()
  await h.result().addPhotos()
  expect(permission).toHaveBeenCalledTimes(1)
  expect(h.result().isPicking).toBe(true)
  p.resolve(granted)
  await first
  expect(picker).toHaveBeenCalledTimes(1)
  expect(h.result().isPicking).toBe(false)
  h.unmount()
})
it("preserves selection on cancel, deduplicates IDs and URIs, caps at three, and supports removal", async () => {
  const h = mount()
  picker.mockResolvedValueOnce(result(asset("a")))
  await h.result().addPhotos()
  await h.result().addPhotos()
  expect(h.result().photos.map((p) => p.uri)).toEqual(["a"])
  expect(picker).toHaveBeenLastCalledWith(
    expect.objectContaining({ selectionLimit: 2 }),
  )
  picker.mockResolvedValueOnce(
    result(
      asset("new-a", "a"),
      asset("a", "different"),
      asset("b"),
      asset("c"),
      asset("d"),
    ),
  )
  await h.result().addPhotos()
  expect(h.result().photos.map((p) => p.uri)).toEqual(["a", "b", "c"])
  await h.result().addPhotos()
  expect(picker).toHaveBeenCalledTimes(3)
  h.result().removePhoto("b")
  expect(h.result().photos.map((p) => p.uri)).toEqual(["a", "c"])
  h.result().clearPhotos()
  expect(h.result().photos).toEqual([])
  h.unmount()
})
it("reports picker failures and permits retry", async () => {
  picker.mockRejectedValueOnce(new Error("unavailable"))
  const h = mount()
  await h.result().addPhotos()
  expect(h.error).toHaveBeenCalledTimes(1)
  expect(h.result().isPicking).toBe(false)
  await h.result().addPhotos()
  expect(picker).toHaveBeenCalledTimes(2)
  h.unmount()
})
it("handles declined permission and settings failure without opening the picker", async () => {
  permission.mockResolvedValue({
    ...granted,
    status: "denied",
    granted: false,
  } as Picker.MediaLibraryPermissionResponse)
  jest
    .mocked(showConfirm)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)
  const settings = jest
    .spyOn(Linking, "openSettings")
    .mockRejectedValueOnce(new Error("settings unavailable"))
  const h = mount()
  await h.result().addPhotos()
  expect(settings).not.toHaveBeenCalled()
  await h.result().addPhotos()
  expect(settings).toHaveBeenCalledTimes(1)
  expect(h.error).toHaveBeenCalledTimes(1)
  expect(picker).not.toHaveBeenCalled()
  expect(h.result().isPicking).toBe(false)
  h.unmount()
  settings.mockRestore()
})
it.each(["clear", "unmount"])(
  "ignores late permission after %s",
  async (action) => {
    const p = deferred<Picker.MediaLibraryPermissionResponse>()
    permission.mockReturnValueOnce(p.promise)
    const h = mount()
    const pending = h.result().addPhotos()
    if (action === "clear") h.result().clearPhotos()
    else h.unmount()
    const renders = h.renderCount()
    p.resolve(granted)
    await pending
    expect(picker).not.toHaveBeenCalled()
    expect(h.renderCount()).toBe(renders)
    expect(h.error).not.toHaveBeenCalled()
    if (action === "clear") h.unmount()
  },
)
it.each(["clear", "unmount"])(
  "ignores late picker assets after %s",
  async (action) => {
    const p = deferred<Picker.ImagePickerResult>()
    picker.mockReturnValueOnce(p.promise)
    const h = mount()
    const pending = h.result().addPhotos()
    await Promise.resolve()
    await Promise.resolve()
    expect(picker).toHaveBeenCalledTimes(1)
    if (action === "clear") h.result().clearPhotos()
    else h.unmount()
    const renders = h.renderCount()
    p.resolve(result(asset("late")))
    await pending
    expect(h.result().photos).toEqual([])
    expect(h.renderCount()).toBe(renders)
    if (action === "clear") h.unmount()
  },
)

/* eslint-disable import/first */
import { renderHookWithEffects } from "./helpers/effectHookHarness"

let mockBlocked: ((event: { data: { action: unknown } }) => void) | undefined
const mockDispatch = jest.fn()
const mockConfirm = jest.fn()
const mockDismiss = jest.fn()
const mockKeyboardVisible = jest.fn(() => false)
const mockTranslate = (key: string) => key
jest.mock("react", () => require("./helpers/effectHookHarness"))
jest.mock("react-native", () => ({
  Keyboard: {
    dismiss: () => mockDismiss(),
    isVisible: () => mockKeyboardVisible(),
  },
}))
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (enabled: boolean, callback: typeof mockBlocked) => {
    mockBlocked = enabled ? callback : undefined
  },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockTranslate }),
}))
jest.mock("@/src/lib/dialog", () => ({
  showConfirm: (...args: unknown[]) => mockConfirm(...args),
}))
import { useConsultExitGuard } from "../src/features/consultation/hooks/useConsultExitGuard"

beforeEach(() => {
  jest.clearAllMocks()
  mockKeyboardVisible.mockReturnValue(false)
  mockBlocked = undefined
})

test("keep writing restores a previously open keyboard, but does not open one that was closed", async () => {
  mockConfirm.mockResolvedValue(false)
  const restoreDraftFocus = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({
      hasDraft: true,
      isSending: false,
      stopGenerating: jest.fn(),
      restoreDraftFocus,
    }),
  )
  await h.result()(jest.fn())
  expect(restoreDraftFocus).not.toHaveBeenCalled()
  mockKeyboardVisible.mockReturnValue(true)
  await h.result()(jest.fn())
  expect(restoreDraftFocus).toHaveBeenCalledTimes(1)
  h.unmount()
})

test("an empty idle conversation changes immediately without a prompt", async () => {
  const stopGenerating = jest.fn(),
    change = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({ hasDraft: false, isSending: false, stopGenerating }),
  )
  await h.result()(change)
  expect(change).toHaveBeenCalledTimes(1)
  expect(mockBlocked).toBeUndefined()
  expect(mockConfirm).not.toHaveBeenCalled()
  expect(stopGenerating).not.toHaveBeenCalled()
  h.unmount()
})

test("keep writing or waiting preserves both the unsent draft and active generation", async () => {
  mockConfirm.mockResolvedValue(false)
  const stopGenerating = jest.fn(),
    change = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({ hasDraft: true, isSending: true, stopGenerating }),
  )
  await h.result()(change)
  expect(mockConfirm).toHaveBeenCalledWith(
    expect.objectContaining({
      description: "consult.exit.bothBody",
      buttonLayout: "vertical",
      cancelLabel: "consult.exit.keepWaiting",
    }),
  )
  expect(change).not.toHaveBeenCalled()
  expect(stopGenerating).not.toHaveBeenCalled()
  expect(mockDismiss).toHaveBeenCalledTimes(1)
  h.unmount()
})

test("rapid actions share one confirmation and stop before the authorized transition", async () => {
  let resolve!: (value: boolean) => void
  mockConfirm.mockImplementation(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  const order: string[] = []
  const stopGenerating = jest.fn(() => {
    order.push("stop")
  })
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({ hasDraft: false, isSending: true, stopGenerating }),
  )
  const first = h.result()(() => {
    order.push("first")
  })
  await h.result()(() => {
    order.push("second")
  })
  resolve(true)
  await first
  expect(mockConfirm).toHaveBeenCalledTimes(1)
  expect(order).toEqual(["stop", "first"])
  h.unmount()
})

test("a generation that finished while the dialog was open is not stopped afterwards", async () => {
  let resolve!: (value: boolean) => void
  mockConfirm.mockImplementation(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  let isSending = true
  const stopGenerating = jest.fn(),
    change = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({ hasDraft: false, isSending, stopGenerating }),
  )
  const pending = h.result()(change)
  isSending = false
  h.rerender()
  resolve(true)
  await pending
  expect(stopGenerating).not.toHaveBeenCalled()
  expect(change).toHaveBeenCalledTimes(1)
  h.unmount()
})

test("a dialog that resolves after unmount cannot navigate or cancel a later screen", async () => {
  let resolve!: (value: boolean) => void
  mockConfirm.mockImplementation(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  const stopGenerating = jest.fn(),
    change = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({ hasDraft: true, isSending: true, stopGenerating }),
  )
  const pending = h.result()(change)
  h.unmount()
  resolve(true)
  await pending
  expect(stopGenerating).not.toHaveBeenCalled()
  expect(change).not.toHaveBeenCalled()
})

test("native back replays the original navigation action once after the dialog closes", async () => {
  mockConfirm.mockResolvedValue(true)
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({
      hasDraft: true,
      isSending: false,
      stopGenerating: jest.fn(),
    }),
  )
  const action = { type: "GO_BACK", source: "consult-route" }
  mockBlocked?.({ data: { action } })
  await Promise.resolve()
  await Promise.resolve()
  expect(mockDispatch).toHaveBeenCalledTimes(1)
  expect(mockDispatch).toHaveBeenCalledWith(action)
  h.unmount()
})

test("back closes history first without discarding a draft or interrupting generation", () => {
  const stopGenerating = jest.fn(),
    dismissOverlay = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({
      hasDraft: true,
      isSending: true,
      stopGenerating,
      dismissOverlay,
    }),
  )
  mockBlocked?.({ data: { action: { type: "GO_BACK" } } })
  expect(dismissOverlay).toHaveBeenCalledTimes(1)
  expect(mockConfirm).not.toHaveBeenCalled()
  expect(stopGenerating).not.toHaveBeenCalled()
  expect(mockDispatch).not.toHaveBeenCalled()
  h.unmount()
})

test("keeping a draft while selecting a different history returns to its composer", async () => {
  mockConfirm.mockResolvedValue(false)
  const restoreDraftFocus = jest.fn(),
    change = jest.fn()
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({
      hasDraft: true,
      isSending: false,
      stopGenerating: jest.fn(),
      dismissOverlay: jest.fn(),
      restoreDraftFocus,
    }),
  )
  await h.result()(change)
  expect(change).not.toHaveBeenCalled()
  expect(restoreDraftFocus).toHaveBeenCalledTimes(1)
  h.unmount()
})

test("canceling or a failed transition releases the guard for another attempt", async () => {
  mockConfirm.mockResolvedValueOnce(false).mockResolvedValue(true)
  const h = renderHookWithEffects(() =>
    useConsultExitGuard({
      hasDraft: true,
      isSending: false,
      stopGenerating: jest.fn(),
    }),
  )
  const change = jest.fn()
  await h.result()(change)
  await expect(
    h.result()(() => Promise.reject(new Error("load failed"))),
  ).rejects.toThrow("load failed")
  await h.result()(change)
  expect(change).toHaveBeenCalledTimes(1)
  expect(mockConfirm).toHaveBeenCalledTimes(3)
  h.unmount()
})

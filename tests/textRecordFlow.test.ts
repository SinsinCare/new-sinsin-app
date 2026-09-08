import type { DialogRequest, DialogResult } from "../src/lib/dialog"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import {
  useTextRecord,
  type TextRecordOptions,
} from "../src/features/home/hooks/useTextRecord"
import { V2DialogHost } from "../src/design-system-v2/components/V2DialogHost"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.requireActual("./helpers/effectHookHarness").useState,
  useRef: jest.requireActual("./helpers/effectHookHarness").useRef,
  useEffect: jest.requireActual("./helpers/effectHookHarness").useEffect,
  useCallback: jest.requireActual("./helpers/effectHookHarness").useCallback,
}))
jest.mock("react-native", () => ({
  ...jest.requireActual("./helpers/reactNativeStub.js"),
  Keyboard: { dismiss: jest.fn() },
  Text: "Text",
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/lib/dialog", () => ({
  showConfirm: jest.fn(),
  registerDialogHost: jest.fn(() => jest.fn()),
}))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("../src/design-system-v2/components/V2Modal", () => ({
  V2Modal: "Modal",
}))
jest.mock("../src/design-system-v2/components/V2BottomSheet", () => ({
  V2BottomSheet: "Sheet",
}))
jest.mock("../src/design-system-v2/hooks/useV2Theme", () => ({
  useV2Theme: () => ({
    colors: jest.requireActual("../src/design-system-v2/tokens/colors")
      .semanticLight,
  }),
}))

const dialog = jest.requireMock("../src/lib/dialog") as {
  showConfirm: jest.Mock
  registerDialogHost: jest.Mock
}
const { trackAnalyticsEvent } = jest.requireMock(
  "../src/features/analytics",
) as { trackAnalyticsEvent: jest.Mock }
const { presentError } = jest.requireMock("../src/lib/errorMessage") as {
  presentError: jest.Mock
}
const openEntry = () => {
  const options: TextRecordOptions = {
    open: true,
    slot: "breakfast",
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  }
  return { options, hook: renderHookWithEffects(() => useTextRecord(options)) }
}
beforeEach(() => jest.clearAllMocks())

test("공백·줄바꿈만 입력하면 분석하지 않는다", async () => {
  const { hook, options } = openEntry()
  hook.result().setText("  \n  ")
  expect(hook.result().canSubmit).toBe(false)
  await hook.result().submit()
  expect(options.onSubmit).not.toHaveBeenCalled()
})
test("여러 줄의 음식은 보존하고 양 끝 공백을 제거해 한 번만 제출한다", async () => {
  const { hook, options } = openEntry()
  let resolve!: () => void
  options.onSubmit = jest.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done
      }),
  )
  hook.rerender()
  hook.result().setText(" 밥 반 공기\n달걀 1개 ")
  const first = hook.result().submit()
  await hook.result().submit()
  await hook.result().close()
  expect(options.onSubmit).toHaveBeenCalledTimes(1)
  expect(options.onSubmit).toHaveBeenCalledWith("밥 반 공기\n달걀 1개")
  expect(options.onClose).not.toHaveBeenCalled()
  expect(hook.result().isSubmitting).toBe(true)
  resolve()
  await first
  expect(hook.result().isSubmitting).toBe(false)
})
test("확인창을 취소하면 입력을 유지하고 다시 닫을 수 있다", async () => {
  const { hook, options } = openEntry()
  hook.result().setText("두부 3조각")
  dialog.showConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  await hook.result().close()
  expect(hook.result().text).toBe("두부 3조각")
  expect(options.onClose).not.toHaveBeenCalled()
  await hook.result().close()
  expect(options.onClose).toHaveBeenCalledTimes(1)
})
test("닫기를 연타해도 확인창을 한 개만 연다", async () => {
  const { hook } = openEntry()
  hook.result().setText("밥")
  let resolve!: (value: boolean) => void
  dialog.showConfirm.mockImplementationOnce(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  const first = hook.result().close()
  await hook.result().close()
  expect(dialog.showConfirm).toHaveBeenCalledTimes(1)
  resolve(false)
  await first
})
test("빈 입력은 확인 없이 닫고 다음 진입에서 새로 시작한다", async () => {
  const { hook, options } = openEntry()
  await hook.result().close()
  expect(dialog.showConfirm).not.toHaveBeenCalled()
  expect(options.onClose).toHaveBeenCalledTimes(1)
  hook.result().setText("임시")
  options.open = false
  hook.rerender()
  options.open = true
  hook.rerender()
  expect(hook.result().text).toBe("")
  expect(
    trackAnalyticsEvent.mock.calls.filter(
      ([event]) => event === "food_text_record_viewed",
    ),
  ).toHaveLength(2)
})
test("제출 실패는 입력을 유지하고 다시 분석할 수 있다", async () => {
  const { hook, options } = openEntry()
  const error = new Error("fixture")
  options.onSubmit = jest
    .fn()
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce(undefined)
  hook.rerender()
  hook.result().setText("밥 반 공기")
  await hook.result().submit()
  expect(hook.result().text).toBe("밥 반 공기")
  expect(presentError).toHaveBeenCalledWith(error, {
    scope: "food-text-record",
  })
  await hook.result().submit()
  expect(options.onSubmit).toHaveBeenCalledTimes(2)
})

test("지난 입력의 늦은 확인 결과가 다시 연 입력창을 닫지 않는다", async () => {
  const { hook, options } = openEntry()
  hook.result().setText("이전 입력")
  let resolve!: (value: boolean) => void
  dialog.showConfirm.mockImplementationOnce(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  const closing = hook.result().close()
  options.open = false
  hook.rerender()
  options.open = true
  hook.rerender()
  hook.result().setText("새 입력")
  resolve(true)
  await closing
  expect(options.onClose).not.toHaveBeenCalled()
  expect(hook.result().text).toBe("새 입력")
})

test.each(["confirm", "sheet"] as const)(
  "%s 닫힘 중에도 원래 내용이 유지되어 빈 팝업으로 바뀌지 않는다",
  async (kind) => {
    const host = renderHookWithEffects(V2DialogHost)
    const enqueue = dialog.registerDialogHost.mock.lastCall[0] as (
      request: DialogRequest,
    ) => Promise<DialogResult>
    const request: DialogRequest = {
      kind,
      title: "저장하지 않고 나갈까요?",
      description: "이번 기록이 사라져요",
      confirmLabel: "저장하지 않고 나가기",
      cancelLabel: "계속 기록하기",
      actions: [{ label: "사진" }, { label: "앨범" }],
    }
    const pending = enqueue(request)
    const index = kind === "confirm" ? 0 : 1
    const opened = host.result().props.children[index].props
    expect(opened.visible).toBe(true)
    opened.onRequestClose?.()
    opened.onClose?.()
    expect(await pending).toBe(null)
    const closing = host.result().props.children[index].props
    expect(closing.visible).toBe(false)
    expect(closing.title).toBe(request.title)
    expect(kind === "confirm" ? closing.description : closing.subTitle).toBe(
      request.description,
    )
    expect(
      kind === "confirm" ? closing.primaryLabel : closing.secondaryLabel,
    ).toBe(kind === "confirm" ? request.confirmLabel : request.cancelLabel)
    host.unmount()
  },
)

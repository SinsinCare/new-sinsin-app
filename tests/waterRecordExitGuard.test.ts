import type { NavigationAction } from "@react-navigation/native"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useRecordExitGuard } from "../src/features/home/hooks/useRecordExitGuard"
import WaterRecordRoute from "../app/record/water"
import MealReportRoute from "../app/meal-report"

jest.mock("react", () => {
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...jest.requireActual("react"),
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useState: harness.useState,
  }
})
jest.mock("@react-navigation/native", () => ({
  usePreventRemove: jest.fn(),
  useNavigation: () => ({
    dispatch: jest.requireMock("@react-navigation/native").dispatch,
  }),
  dispatch: jest.fn(),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/lib/dialog", () => ({ showConfirm: jest.fn() }))
jest.mock("../src/shared/navigation", () => ({
  useGoBack: () => jest.requireMock("../src/shared/navigation").goBack,
  goBack: jest.fn(),
}))
jest.mock("../src/features/home/stores/recordPageStore", () => {
  const state = {
    params: { kind: "water", onClose: jest.fn() },
    clear: jest.fn(),
  }
  return {
    useRecordPageStore: Object.assign(() => state.params, {
      getState: () => state,
    }),
    state,
  }
})
jest.mock(
  "../src/features/home/components/record/pages/WaterRecordPage",
  () => ({ WaterRecordPage: "WaterRecordPage" }),
)
jest.mock("../src/features/home/components/FoodAnalysisResult", () => ({
  FoodAnalysisResult: "FoodAnalysisResult",
}))
jest.mock("../src/features/home/stores/mealReportPageStore", () => {
  const state = {
    params: {
      showAddButton: true,
      onClose: jest.fn(),
      onAddToRecord: jest.fn(),
    },
    clear: jest.fn(),
  }
  return {
    useMealReportPageStore: Object.assign(() => state.params, {
      getState: () => state,
    }),
    state,
  }
})

const navigation = jest.requireMock("@react-navigation/native") as {
  usePreventRemove: jest.Mock
  dispatch: jest.Mock
}
const { showConfirm } = jest.requireMock("../src/lib/dialog") as {
  showConfirm: jest.Mock
}
const { goBack } = jest.requireMock("../src/shared/navigation") as {
  goBack: jest.Mock
}
const { state } = jest.requireMock(
  "../src/features/home/stores/recordPageStore",
) as {
  state: { params: { onClose: jest.Mock }; clear: jest.Mock }
}
const mealState = jest.requireMock(
  "../src/features/home/stores/mealReportPageStore",
).state as {
  params: {
    showAddButton: boolean
    onClose: jest.Mock
    onAddToRecord: jest.Mock
  }
  clear: jest.Mock
}

function blockedNavigation(action: NavigationAction = { type: "GO_BACK" }) {
  const [blocked, listener] = navigation.usePreventRemove.mock.lastCall as [
    boolean,
    (event: { data: { action: NavigationAction } }) => Promise<void>,
  ]
  expect(blocked).toBe(true)
  return listener({ data: { action } })
}

function renderGuard(options = { hasChanges: true, isSaving: false }) {
  return renderHookWithEffects(() =>
    useRecordExitGuard({ ...options, onBack: goBack }),
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  mealState.params.showAddButton = true
})

test("빈 기록은 바로 나가고 추가한 기록이 있으면 가드를 켠다", () => {
  const options = { hasChanges: false, isSaving: false }
  const hook = renderGuard(options)
  expect(navigation.usePreventRemove.mock.lastCall[0]).toBe(false)
  options.hasChanges = true
  hook.rerender()
  expect(navigation.usePreventRemove.mock.lastCall[0]).toBe(true)
  options.hasChanges = false
  hook.rerender()
  expect(navigation.usePreventRemove.mock.lastCall[0]).toBe(false)
})

test.each(["GO_BACK", "POP", "REPLACE"])(
  "%s 이탈은 확인 전까지 멈추고 승인한 원래 동작을 이어 간다",
  async (type) => {
    renderGuard()
    let resolve!: (discard: boolean) => void
    showConfirm.mockImplementation(
      () => new Promise<boolean>((done) => (resolve = done)),
    )
    const action = { type, source: "water-record", target: "root-stack" }
    const attempt = blockedNavigation(action)
    expect(navigation.dispatch).not.toHaveBeenCalled()
    expect(state.clear).not.toHaveBeenCalled()
    resolve(true)
    await attempt
    expect(navigation.dispatch).toHaveBeenCalledTimes(1)
    expect(navigation.dispatch).toHaveBeenCalledWith(action)
  },
)

test("계속 기록하기는 입력을 보존하고 다음 뒤로가기에서 다시 묻는다", async () => {
  renderGuard()
  showConfirm.mockResolvedValue(false)
  await blockedNavigation()
  await blockedNavigation()
  expect(showConfirm).toHaveBeenCalledTimes(2)
  expect(navigation.dispatch).not.toHaveBeenCalled()
  expect(state.clear).not.toHaveBeenCalled()
})

test("확인창이 떠 있는 동안 뒤로가기를 연타해도 창은 하나다", async () => {
  renderGuard()
  let resolve!: (discard: boolean) => void
  showConfirm.mockImplementation(
    () => new Promise<boolean>((done) => (resolve = done)),
  )
  const first = blockedNavigation()
  await blockedNavigation()
  expect(showConfirm).toHaveBeenCalledTimes(1)
  resolve(false)
  await first
})

test("저장 중에는 나가지 않고 저장 실패 후에는 다시 확인한다", async () => {
  const options = { hasChanges: true, isSaving: true }
  const hook = renderGuard(options)
  await blockedNavigation()
  expect(showConfirm).not.toHaveBeenCalled()
  expect(navigation.dispatch).not.toHaveBeenCalled()
  options.isSaving = false
  hook.rerender()
  showConfirm.mockResolvedValue(false)
  await blockedNavigation()
  expect(showConfirm).toHaveBeenCalledTimes(1)
})

test("저장 성공 직후의 오래된 dirty 상태는 다시 확인하지 않는다", async () => {
  const hook = renderGuard()
  hook.result().leaveAfterSave()
  expect(goBack).toHaveBeenCalledTimes(1)
  await blockedNavigation()
  expect(showConfirm).not.toHaveBeenCalled()
  expect(navigation.dispatch).toHaveBeenCalledWith({ type: "GO_BACK" })
})

test("다른 경로로 언마운트된 뒤 늦게 온 확인 결과는 이동하지 않는다", async () => {
  const hook = renderGuard()
  let resolve!: (discard: boolean) => void
  showConfirm.mockImplementation(
    () => new Promise<boolean>((done) => (resolve = done)),
  )
  const attempt = blockedNavigation()
  hook.unmount()
  resolve(true)
  await attempt
  expect(navigation.dispatch).not.toHaveBeenCalled()
})

test("라우트는 뒤로가기를 시도할 때가 아니라 실제 언마운트 때만 상태를 비운다", () => {
  const route = renderHookWithEffects(WaterRecordRoute)
  route.result()!.props.onBack()
  expect(goBack).toHaveBeenCalledTimes(1)
  expect(state.params.onClose).not.toHaveBeenCalled()
  expect(state.clear).not.toHaveBeenCalled()
  route.unmount()
  expect(state.params.onClose).toHaveBeenCalledTimes(1)
  expect(state.clear).toHaveBeenCalledTimes(1)
})

test("식단 리포트의 시스템 뒤로가기는 결과 문구로 묻고 취소하면 화면을 보존한다", async () => {
  const route = renderHookWithEffects(MealReportRoute)
  showConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  await blockedNavigation()
  expect(showConfirm).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "foodResult.unsavedTitle",
      confirmLabel: "foodResult.leaveWithoutSaving",
      cancelLabel: "foodResult.returnToResult",
    }),
  )
  expect(navigation.dispatch).not.toHaveBeenCalled()
  expect(mealState.clear).not.toHaveBeenCalled()
  await blockedNavigation()
  expect(navigation.dispatch).toHaveBeenCalledTimes(1)
  expect(mealState.clear).not.toHaveBeenCalled()
  route.unmount()
  expect(mealState.params.onClose).toHaveBeenCalledTimes(1)
  expect(mealState.clear).toHaveBeenCalledTimes(1)
})

test("식단 결과에서 이미 승인한 닫기는 두 번째 확인창 없이 이동한다", async () => {
  const route = renderHookWithEffects(MealReportRoute)
  route.result()!.props.children.props.onClose()
  expect(goBack).toHaveBeenCalledTimes(1)
  await blockedNavigation()
  expect(showConfirm).not.toHaveBeenCalled()
  expect(mealState.clear).not.toHaveBeenCalled()
  route.unmount()
  expect(mealState.clear).toHaveBeenCalledTimes(1)
})

test("식단 저장 중에는 이탈을 막고 요청이 끝나면 확인을 다시 허용한다", async () => {
  let resolve!: () => void
  mealState.params.onAddToRecord.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done
      }),
  )
  const route = renderHookWithEffects(MealReportRoute)
  const saving = route.result()!.props.children.props.onAddToRecord()
  await blockedNavigation()
  expect(showConfirm).not.toHaveBeenCalled()
  expect(navigation.dispatch).not.toHaveBeenCalled()
  resolve()
  await saving
  showConfirm.mockResolvedValueOnce(false)
  await blockedNavigation()
  expect(showConfirm).toHaveBeenCalledTimes(1)
})

test("이미 저장된 식단 리포트는 미저장 확인을 띄우지 않는다", () => {
  mealState.params.showAddButton = false
  renderHookWithEffects(MealReportRoute)
  expect(navigation.usePreventRemove.mock.lastCall[0]).toBe(false)
})

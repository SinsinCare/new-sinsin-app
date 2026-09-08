/* eslint-disable import/first */
let mockBlocked: ((event: { data: { action: unknown } }) => void) | undefined
const mockDispatch = jest.fn()
const mockConfirm = jest.fn()
const mockTransition = jest.fn(() => Promise.resolve())
const mockDismiss = jest.fn()
jest.mock("react", () => ({ useRef: (value: unknown) => ({ current: value }) }))
jest.mock("react-native", () => ({
  Keyboard: { dismiss: () => mockDismiss() },
}))
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (enabled: boolean, callback: typeof mockBlocked) => {
    mockBlocked = enabled ? callback : undefined
  },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/lib/dialog", () => ({
  showConfirm: (...args: unknown[]) => mockConfirm(...args),
}))
jest.mock("@/src/shared/components/appModalGate", () => ({
  afterModalTransitions: () => mockTransition(),
}))
import { useCommentDraftGuard } from "@/src/features/recipe/hooks/useCommentDraftGuard"

beforeEach(() => {
  jest.clearAllMocks()
  mockBlocked = undefined
})

test("empty drafts leave immediately without a dialog", async () => {
  const leave = jest.fn()
  await useCommentDraftGuard(false)(leave)
  expect(leave).toHaveBeenCalledTimes(1)
  expect(mockConfirm).not.toHaveBeenCalled()
  expect(mockBlocked).toBeUndefined()
})

test("keep writing preserves the draft and target", async () => {
  mockConfirm.mockResolvedValueOnce(false)
  const changeTarget = jest.fn()
  await useCommentDraftGuard(true)(changeTarget)
  expect(changeTarget).not.toHaveBeenCalled()
  expect(mockDismiss).toHaveBeenCalledTimes(1)
})

test("rapid repeated exits present only one confirmation", async () => {
  let answer!: (value: boolean) => void
  mockConfirm.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        answer = resolve
      }),
  )
  const guard = useCommentDraftGuard(true)
  const first = jest.fn(),
    duplicate = jest.fn()
  const pending = guard(first)
  await Promise.resolve()
  await guard(duplicate)
  expect(mockConfirm).toHaveBeenCalledTimes(1)
  answer(true)
  await pending
  expect(first).toHaveBeenCalledTimes(1)
  expect(duplicate).not.toHaveBeenCalled()
  expect(mockTransition).toHaveBeenCalledTimes(2)
})

test("back gesture replays the captured navigation action after confirmation", async () => {
  mockConfirm.mockResolvedValueOnce(true)
  useCommentDraftGuard(true)
  const action = { type: "GO_BACK", source: "post" }
  mockBlocked?.({ data: { action } })
  for (let i = 0; i < 6; i++) await Promise.resolve()
  expect(mockDispatch).toHaveBeenCalledWith(action)
  expect(mockDispatch).toHaveBeenCalledTimes(1)
})

test("canceling allows a later exit attempt", async () => {
  mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  const guard = useCommentDraftGuard(true),
    leave = jest.fn()
  await guard(leave)
  await guard(leave)
  expect(mockConfirm).toHaveBeenCalledTimes(2)
  expect(leave).toHaveBeenCalledTimes(1)
})

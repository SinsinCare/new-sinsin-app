/* eslint-disable import/first -- native boundaries are replaced before the real hook is loaded. */
import { createElement } from "react"
// react-dom is installed; the repository does not ship its optional declaration package.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToString } = require("react-dom/server") as {
  renderToString: (node: ReturnType<typeof createElement>) => string
}

const mockAnnounce = jest.fn()
const mockHaptic = jest.fn()
const mockError = jest.fn()
const mockDismiss = jest.fn()
jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: mockAnnounce },
  Keyboard: { dismiss: mockDismiss },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("../src/lib/haptics", () => ({ hapticStepAdvance: mockHaptic }))
jest.mock("../src/lib/errorMessage", () => ({ presentError: mockError }))
import { useRecordSaveFeedback } from "../src/features/home/hooks/useRecordSaveFeedback"
/* eslint-enable import/first */

// Real React supplies refs during this render. These checks cover callback/async behavior,
// not layout, effects or state rerenders, which are inspected separately in the simulator.
function getActions() {
  let actions!: ReturnType<typeof useRecordSaveFeedback>
  function Capture() {
    actions = useRecordSaveFeedback()
    return null
  }
  renderToString(createElement(Capture))
  return actions
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
})
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

test("rapid repeated presses send one request and acknowledge only its successful response", async () => {
  let resolve!: (value: boolean) => void
  const request = jest.fn(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  const actions = getActions()
  const first = actions.run(request)
  expect(await actions.run(request)).toBe(false)
  expect(request).toHaveBeenCalledTimes(1)
  expect(mockAnnounce).not.toHaveBeenCalled()
  resolve(true)
  expect(await first).toBe(true)
  expect(mockAnnounce).toHaveBeenCalledTimes(1)
  expect(mockHaptic).toHaveBeenCalledTimes(1)
})

test("a handled save failure has no success feedback and releases the lock for retry", async () => {
  const actions = getActions()
  expect(await actions.run(async () => false)).toBe(false)
  expect(mockAnnounce).not.toHaveBeenCalled()
  expect(mockHaptic).not.toHaveBeenCalled()
  expect(await actions.run(async () => true)).toBe(true)
  expect(mockAnnounce).toHaveBeenCalledTimes(1)
})

test("an unexpected rejection is presented, does not acknowledge success and can be retried", async () => {
  const actions = getActions()
  const error = new Error("offline test fixture")
  expect(
    await actions.run(async () => {
      throw error
    }),
  ).toBe(false)
  expect(mockError).toHaveBeenCalledWith(error, { scope: "health-record-save" })
  expect(mockAnnounce).not.toHaveBeenCalled()
  expect(await actions.run(async () => true)).toBe(true)
})

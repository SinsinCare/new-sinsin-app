import { Linking } from "react-native"
import { openRestaurantLink } from "../src/features/restaurant/utils/openRestaurantLink"
import { showErrorToast } from "@/src/lib/toast"
jest.mock("react-native", () => ({ Linking: { openURL: jest.fn() } }))
jest.mock("@/src/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}))
jest.mock("@/src/lib/toast", () => ({ showErrorToast: jest.fn() }))
const open = jest.mocked(Linking.openURL)
beforeEach(() => jest.clearAllMocks())
it("does not launch an absent or invalid normalized target", async () => {
  expect(await openRestaurantLink(null)).toBe(false)
  expect(open).not.toHaveBeenCalled()
})
it("coalesces pending taps then allows another launch", async () => {
  let resolve!: () => void
  open.mockReturnValueOnce(
    new Promise<void>((r) => {
      resolve = r
    }),
  )
  const a = openRestaurantLink("https://example.com")
  const b = openRestaurantLink("https://example.com")
  expect(a).toBe(b)
  await Promise.resolve()
  expect(open).toHaveBeenCalledTimes(1)
  resolve()
  expect(await a).toBe(true)
  open.mockResolvedValueOnce(undefined)
  await openRestaurantLink("https://example.com")
  expect(open).toHaveBeenCalledTimes(2)
})
it.each(["web", "phone"] as const)(
  "handles %s failure without unhandled rejection and permits retry",
  async (kind) => {
    open
      .mockRejectedValueOnce(new Error("native payload"))
      .mockResolvedValueOnce(undefined)
    const url = kind === "phone" ? "tel:0212345678" : "https://example.com"
    expect(await openRestaurantLink(url, kind)).toBe(false)
    expect(showErrorToast).toHaveBeenCalledWith(
      kind === "phone"
        ? "restaurant.detail.callFailed"
        : "restaurant.detail.linkFailed",
    )
    expect(await openRestaurantLink(url, kind)).toBe(true)
    expect(showErrorToast).toHaveBeenCalledTimes(1)
  },
)

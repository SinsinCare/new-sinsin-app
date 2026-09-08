import { Linking } from "react-native"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useRouteAppLaunch } from "../src/features/restaurant/hooks/useRouteAppLaunch"
import type { MapAppLink } from "../src/features/restaurant/utils/mapAppLinks"
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
jest.mock("react-native", () => ({ Linking: { openURL: jest.fn() } }))
const launch = jest.mocked(Linking.openURL)
const link: MapAppLink = {
  key: "kakao",
  appUrl: "kakaomap://test",
  webUrl: "https://example.com/route",
}
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mount() {
  let visible = true
  let targetKey = "first"
  const onClose = jest.fn()
  const h = renderHookWithEffects(() =>
    useRouteAppLaunch({ visible, targetKey, onClose }),
  )
  return {
    ...h,
    onClose,
    visible: (v: boolean) => {
      visible = v
      h.rerender()
    },
    target: (v: string) => {
      targetKey = v
      h.rerender()
    },
  }
}
beforeEach(() => launch.mockReset())
it("opens once and stays locked until the successful sheet closes", async () => {
  const p = deferred()
  launch.mockReturnValueOnce(p.promise)
  const h = mount()
  const open = h.result().open
  const first = open(link)
  await open(link)
  expect(h.result().opening).toBe("kakao")
  p.resolve()
  await first
  await open(link)
  expect(launch).toHaveBeenCalledTimes(1)
  expect(h.onClose).toHaveBeenCalledTimes(1)
  h.unmount()
})
it("falls back to web once after native rejection", async () => {
  launch
    .mockRejectedValueOnce(new Error("no app"))
    .mockResolvedValueOnce(undefined)
  const h = mount()
  await h.result().open(link)
  expect(launch.mock.calls.map((c) => c[0])).toEqual([link.appUrl, link.webUrl])
  expect(h.onClose).toHaveBeenCalledTimes(1)
  h.unmount()
})
it("retains a failed sheet and allows another attempt", async () => {
  launch
    .mockRejectedValueOnce(new Error("native"))
    .mockRejectedValueOnce(new Error("web"))
  const h = mount()
  await h.result().open(link)
  expect(h.result()).toMatchObject({ opening: null, failed: true })
  expect(h.onClose).not.toHaveBeenCalled()
  launch.mockResolvedValueOnce(undefined)
  await h.result().open(link)
  expect(h.result().failed).toBe(false)
  expect(h.onClose).toHaveBeenCalledTimes(1)
  h.unmount()
})
it.each(["close", "hidden", "target", "unmount"])(
  "ignores late native failure after %s without launching web",
  async (action) => {
    const p = deferred()
    launch.mockReturnValueOnce(p.promise)
    const h = mount()
    const first = h.result().open(link)
    if (action === "close") h.result().close()
    else if (action === "hidden") h.visible(false)
    else if (action === "target") h.target("second")
    else h.unmount()
    p.reject(new Error("late"))
    await first
    expect(launch).toHaveBeenCalledTimes(1)
    expect(h.onClose).toHaveBeenCalledTimes(action === "close" ? 1 : 0)
    if (action !== "unmount") h.unmount()
  },
)
it("late web completion cannot close a reopened sheet", async () => {
  const p = deferred()
  launch
    .mockRejectedValueOnce(new Error("native"))
    .mockReturnValueOnce(p.promise)
  const h = mount()
  const first = h.result().open(link)
  await Promise.resolve()
  h.visible(false)
  h.visible(true)
  p.resolve()
  await first
  expect(h.onClose).not.toHaveBeenCalled()
  expect(h.result()).toMatchObject({ opening: null, failed: false })
  h.unmount()
})
it("does not retry the same URL or launch from a hidden sheet", async () => {
  launch.mockRejectedValue(new Error("unavailable"))
  const h = mount()
  await h.result().open({ ...link, webUrl: link.appUrl })
  expect(launch).toHaveBeenCalledTimes(1)
  h.visible(false)
  await h.result().open(link)
  expect(launch).toHaveBeenCalledTimes(1)
  h.unmount()
})

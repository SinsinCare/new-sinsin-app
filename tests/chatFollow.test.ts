import { useChatFollow } from "../src/features/consultation/hooks/useChatFollow"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
jest.mock("react", () => require("./helpers/effectHookHarness"))

test("opening a disclosure while streaming prevents all programmatic layout following until resumed", () => {
  const scrollToEnd = jest.fn()
  const listRef = { current: { scrollToEnd } }
  const followRef = { current: true }
  let streaming = true
  let latestKey = "local-1"
  const h = renderHookWithEffects(() =>
    useChatFollow({ listRef, followRef, latestKey, streaming }),
  )
  h.result().onLayout(600)
  h.result().onContentSize(800)
  h.result().onScroll(200, 800, 600)
  scrollToEnd.mockClear()
  h.result().pause()
  h.result().onContentSize(1100)
  h.result().onScroll(500, 1100, 600) // native clamp/programmatic scroll is not user permission to follow
  h.result().onLayout(500)
  expect(scrollToEnd).not.toHaveBeenCalled()
  expect(followRef.current).toBe(false)
  expect(h.result().awayFromBottom).toBe(true)
  streaming = false
  h.rerender()
  h.result().onContentSize(1150) // server ID is no longer part of latestKey
  expect(scrollToEnd).not.toHaveBeenCalled()
  h.result().resume(false)
  expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false })
  expect(followRef.current).toBe(true)
  latestKey = "local-2"
  h.rerender()
  h.result().onContentSize(1300)
  expect(followRef.current).toBe(true)
  h.unmount()
})
test("dragging away pauses and dragging to the real bottom resumes; a new conversation resets", () => {
  const scrollToEnd = jest.fn()
  const listRef = { current: { scrollToEnd } }
  const followRef = { current: true }
  let latestKey = "message-1-10"
  const h = renderHookWithEffects(() =>
    useChatFollow({ listRef, followRef, latestKey, streaming: false }),
  )
  h.result().onContentSize(1600)
  h.result().onLayout(600)
  h.result().onDragStart()
  h.result().onScroll(500, 1600, 600)
  h.result().onDragEnd()
  expect(followRef.current).toBe(false)
  expect(h.result().awayFromBottom).toBe(true)
  scrollToEnd.mockClear()
  h.result().onContentSize(1800)
  expect(scrollToEnd).not.toHaveBeenCalled()
  h.result().onDragStart()
  h.result().onScroll(1200, 1800, 600)
  h.result().onDragEnd()
  expect(followRef.current).toBe(true)
  expect(h.result().awayFromBottom).toBe(false)
  h.result().pause()
  latestKey = "message-2-12"
  h.rerender()
  h.result().onContentSize(900)
  expect(followRef.current).toBe(true)
  expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false })
  h.unmount()
})

test("accessibility scrolling away from the bottom pauses even without a drag event", () => {
  const scrollToEnd = jest.fn()
  const followRef = { current: true }
  const listRef = { current: { scrollToEnd } }
  const h = renderHookWithEffects(() =>
    useChatFollow({ listRef, followRef, latestKey: "one", streaming: true }),
  )
  h.result().onContentSize(1600)
  h.result().onScroll(1000, 1600, 600)
  h.result().onScroll(500, 1600, 600)
  scrollToEnd.mockClear()
  h.result().onContentSize(1800)
  expect(scrollToEnd).not.toHaveBeenCalled()
  expect(h.result().awayFromBottom).toBe(true)
  h.unmount()
})

test("programmatic resume is not mistaken for a user fling", () => {
  const scrollToEnd = jest.fn()
  const followRef = { current: true }
  const listRef = { current: { scrollToEnd } }
  const h = renderHookWithEffects(() =>
    useChatFollow({ listRef, followRef, latestKey: "one", streaming: true }),
  )
  h.result().onContentSize(1600)
  h.result().onScroll(1000, 1600, 600)
  h.result().onDragStart()
  h.result().onScroll(995, 1600, 600)
  h.result().onDragEnd()
  h.result().onMomentumStart()
  h.result().onScroll(800, 1600, 600)
  expect(followRef.current).toBe(false)
  h.result().resume()
  h.result().onMomentumStart()
  h.result().onScroll(900, 1600, 600)
  expect(followRef.current).toBe(true)
  h.result().onMomentumEnd()
  h.unmount()
})

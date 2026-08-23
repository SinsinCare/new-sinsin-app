import {
  ScreenDwellTracker,
  type ScreenExitSignal,
} from "../../src/features/analytics/screenDwell"

function names(signals: readonly ScreenExitSignal[]): string[] {
  return signals.map(
    (signal) => `${signal.screen}:${signal.reason}:${signal.dwellSeconds}`,
  )
}

describe("ScreenDwellTracker", () => {
  test("navigation emits previous screen exit with exact seconds", () => {
    const tracker = new ScreenDwellTracker()
    expect(tracker.enter("home", 1_000)).toEqual({ exits: [], entered: true })
    expect(names(tracker.enter("restaurant_map", 6_400).exits)).toEqual([
      "home:navigation:5",
    ])
  })

  test("background exits once and resume starts a new segment", () => {
    const tracker = new ScreenDwellTracker()
    tracker.enter("restaurant_map", 10_000)
    expect(names(tracker.background(13_600))).toEqual([
      "restaurant_map:background:4",
    ])
    expect(tracker.background(14_000)).toEqual([])
    tracker.resume(20_000)
    expect(names(tracker.background(22_400))).toEqual([
      "restaurant_map:background:2",
    ])
  })

  test("same screen render does not duplicate view or reset dwell", () => {
    const tracker = new ScreenDwellTracker()
    tracker.enter("home", 1_000)
    expect(tracker.enter("home", 9_000)).toEqual({ exits: [], entered: false })
    expect(names(tracker.enter("recipe", 11_500).exits)).toEqual([
      "home:navigation:11",
    ])
  })

  test("negative clock movement clamps dwell to zero", () => {
    const tracker = new ScreenDwellTracker()
    tracker.enter("home", 10_000)
    expect(tracker.enter("recipe", 5_000).exits[0]?.dwellSeconds).toBe(0)
  })
})

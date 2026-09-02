/**
 * WebView 프로세스 회수 → 되살리기 정책 (`reviveController`).
 *
 * 실측된 결함: 지도를 켜 둔 채 다른 앱에 다녀오면 iOS 가 WKWebView 콘텐츠 프로세스를
 * 죽이고, 앱은 그 이벤트를 SDK 실패로 읽어 "지도를 불러오지 못했어요" 로 내려갔다
 * (2026-09-01). 정책: 상한 안에서는 리로드, 넘기면 실패.
 */
import { createReviveController } from "../src/features/restaurant/map/reviveController"

function build(maxRevives: number) {
  const reload = jest.fn()
  const fail = jest.fn()
  const controller = createReviveController({ maxRevives, reload, fail })
  return { controller, reload, fail }
}

describe("지도 WebView 되살리기 정책", () => {
  test("프로세스가 죽으면 실패가 아니라 리로드다", () => {
    const { controller, reload, fail } = build(3)
    expect(controller.processGone("content process terminated")).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(fail).not.toHaveBeenCalled()
  })

  test("되살아난 뒤의 ready 만 복원 대상이다 — 첫 로드의 ready 는 아니다", () => {
    const { controller } = build(3)
    expect(controller.consumeReady()).toBe(false) // 첫 로드
    controller.processGone("gone")
    expect(controller.consumeReady()).toBe(true) // 되살아난 ready
    expect(controller.consumeReady()).toBe(false) // 한 번만
  })

  test("상한(3)까지는 리로드, 넘기면 실패로 올린다", () => {
    const { controller, reload, fail } = build(3)
    expect(controller.processGone("1")).toBe(true)
    expect(controller.processGone("2")).toBe(true)
    expect(controller.processGone("3")).toBe(true)
    expect(reload).toHaveBeenCalledTimes(3)
    expect(fail).not.toHaveBeenCalled()

    expect(controller.processGone("4")).toBe(false)
    expect(reload).toHaveBeenCalledTimes(3)
    expect(fail).toHaveBeenCalledWith("4")
    expect(controller.count()).toBe(3)
  })

  test("포기한 뒤의 ready 는 복원 대상이 아니다", () => {
    const { controller } = build(0)
    expect(controller.processGone("gone")).toBe(false)
    expect(controller.consumeReady()).toBe(false)
  })
})

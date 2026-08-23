/**
 * **제스처 없이 켠 스피너가 스크롤을 영구히 밀던 결함** (2026-08-21)
 * 대상: `src/shared/refresh/useRefreshable.tsx`
 *
 * ## 실측된 결함
 *
 * 사용자: "레시피는 탭을 계속 누르면 위에 여백이 점점 늘어나는데".
 * 재현: 레시피 탭 맨 위에서 재탭 반복 → 고정층과 첫 줄 사이 빈 공간이 0 → 약 200pt →
 * 약 270pt 로 **누적**. 손가락으로 한 번 당기면 통째로 사라진다 — 콘텐츠가 밀려
 * 그려진 것이 아니라 **스크롤 오프셋이 쌓여 있었다**는 뜻이다.
 *
 * ## 왜 그런가 (RN 의 iOS 구현에 그대로 있다)
 *
 * `RCTRefreshControl.m` 의 `beginRefreshingProgrammatically` 는 스피너를 보여 주려고
 * `contentOffset.y -= self.frame.size.height` 로 스크롤을 직접 내린다. 끝날 때의 복원은
 * **조건부**다(`contentOffset.y < -contentInset.top` 일 때만). 그 사이 목록이 다시
 * 레이아웃되면(FlashList v2 는 오프셋을 스스로 관리한다) 조건이 깨지고, 밀어 둔 만큼이
 * 그대로 남는다. 부를 때마다 한 번씩 쌓인다.
 *
 * 그 경로는 **`refreshing` 이 JS 쪽에서 false→true 로 바뀔 때만** 탄다. 손가락으로
 * 당기면 UIKit 이 먼저 `refreshControlValueChanged` 를 내보내 내부 상태를 이미 YES 로
 * 만들어 두므로, 뒤이어 JS 가 `refreshing={true}` 를 줘도 아무 일도 일어나지 않는다.
 * 즉 결함은 정확히 **"제스처 없이 켠 스피너"** 에만 있다.
 *
 * ## 그래서 무엇을 단언하나
 *
 * 구현 세부(`runningSource` 같은 내부 이름)가 아니라 **관측 가능한 계약**을 본다 —
 * 화면이 실제로 RN 에 넘기는 `RefreshControl` 의 `refreshing` 프롭. 프로그램 호출로는
 * 그 값이 절대 참이 되지 않고, 제스처로는 참이 된다.
 *
 * ## 어떻게 렌더러 없이 돌리나
 *
 * `tests/helpers/hookHarness.ts` 로 훅 본문을 그대로 돌린다(사본을 검사하면 원본이
 * 바뀌어도 초록으로 남는다). `useEffect` 만 무동작으로 둔다 — 이 훅의 이펙트는
 * 언마운트 표시 하나뿐이고 `mountedRef` 는 이미 `true` 로 시작한다.
 */
/* eslint-disable import/first -- jest.mock 은 호이스팅되므로 import 보다 위에 적는다. */

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
    useEffect: () => {},
  }
})

/* `RefreshControl` 은 문자열 태그로 둔다 — 엘리먼트의 **프롭**만 보면 되는 계약이다. */
jest.mock("react-native", () => ({ RefreshControl: "RefreshControl" }))

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ refetchQueries: mockRefetchQueries }),
}))
jest.mock("@/src/hooks/useSurface", () => ({
  useSurface: () => ({ isDark: false, brand: "#FE7139", card: "#FFFFFF" }),
}))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
jest.mock("@/src/lib/errorMessage", () => ({ presentError: jest.fn() }))

import { renderHookSync } from "./helpers/hookHarness"
import { hapticSelection } from "@/src/lib/haptics"
import { useRefreshable } from "@/src/shared/refresh/useRefreshable"

const mockRefetchQueries = jest.fn(() => Promise.resolve())

const KEYS = [["feed"]] as const

type ControlProps = { refreshing: boolean; onRefresh: () => void }

/** 화면이 스크롤 컨테이너에 실제로 넘기는 컨트롤의 프롭. */
function control(handle: ReturnType<typeof render>): ControlProps {
  const element = handle.result().scrollProps.refreshControl as unknown as {
    props: ControlProps
  }
  return element.props
}

function render() {
  return renderHookSync(() => useRefreshable({ queryKeys: KEYS, scope: "t" }))
}

/** 마이크로태스크를 비우고 최소 노출 타이머를 앞당겨 한 번의 실행을 끝낸다. */
async function settle(): Promise<void> {
  await jest.advanceTimersByTimeAsync(1000)
}

beforeEach(() => {
  jest.useFakeTimers()
  mockRefetchQueries.mockClear()
  ;(hapticSelection as jest.Mock).mockClear()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("프로그램 새로고침은 스피너를 켜지 않는다", () => {
  it("`refresh()` 를 불러도 `RefreshControl` 의 `refreshing` 은 거짓 그대로다", async () => {
    /*
      이 한 줄이 사용자가 본 여백 누적의 유일한 입구다. 참이 되는 순간
      `beginRefreshingProgrammatically` 가 돌고 스크롤이 컨트롤 높이만큼 밀린다.
    */
    const handle = render()
    expect(control(handle).refreshing).toBe(false)

    handle.result().refresh()
    expect(control(handle).refreshing).toBe(false)

    await settle()
    expect(control(handle).refreshing).toBe(false)
  })

  it("그래도 **같은 본문**이 돈다 — 다시 받기는 실제로 나간다", async () => {
    // 스피너를 껐다고 새로고침까지 없어지면 복구 경로가 통째로 죽는다.
    const handle = render()
    handle.result().refresh()
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1)
    await settle()
  })

  it("여러 번 불러도 스피너는 한 번도 켜지지 않는다 — 누적의 원천이 없다", async () => {
    const handle = render()
    for (let i = 0; i < 3; i += 1) {
      handle.result().refresh()
      expect(control(handle).refreshing).toBe(false)
      await settle()
      expect(control(handle).refreshing).toBe(false)
    }
    expect(mockRefetchQueries).toHaveBeenCalledTimes(3)
  })

  it("진동은 **손가락에 대한 답**이라 프로그램 경로에는 없다", async () => {
    const handle = render()
    handle.result().refresh()
    expect(hapticSelection).not.toHaveBeenCalled()
    await settle()
  })
})

describe("제스처 새로고침은 예전 그대로다", () => {
  it("컨트롤의 `onRefresh` 가 불리면 `refreshing` 이 켜진다", async () => {
    /*
      제스처는 UIKit 이 이미 스피너를 띄워 둔 상태다 — 여기서 켜는 것은 "계속 돌려라"
      이지 "스크롤을 밀어라" 가 아니다(머리말). 이 갈래가 죽으면 당김이 즉시 멈춘다.
    */
    const handle = render()
    control(handle).onRefresh()
    expect(control(handle).refreshing).toBe(true)

    await settle()
    expect(control(handle).refreshing).toBe(false)
  })

  it("제스처에는 진동이 붙는다", async () => {
    const handle = render()
    control(handle).onRefresh()
    expect(hapticSelection).toHaveBeenCalledTimes(1)
    await settle()
  })

  it("컨트롤이 받는 핸들러는 `refresh` 와 **다른 함수**다", () => {
    /* 같은 함수를 두 자리에 꽂으면 갈라 놓은 것이 아니다 — 되돌림이 여기서 잡힌다. */
    const handle = render()
    expect(control(handle).onRefresh).not.toBe(handle.result().refresh)
  })
})

describe("`isRunning` — 스피너가 없어진 자리를 화면이 메울 수 있게", () => {
  it("두 경로 모두에서 참이다", async () => {
    const handle = render()
    expect(handle.result().isRunning).toBe(false)

    handle.result().refresh()
    expect(handle.result().isRunning).toBe(true)
    await settle()
    expect(handle.result().isRunning).toBe(false)

    control(handle).onRefresh()
    expect(handle.result().isRunning).toBe(true)
    await settle()
    expect(handle.result().isRunning).toBe(false)
  })

  it("최소 노출 시간 동안 붙잡힌다 — 40ms 에 답해도 깜빡이지 않는다", async () => {
    /*
      캐시가 즉시 답하면 표시가 한 프레임 스쳤다 사라져 "안 눌렸나" 로 읽힌다.
      제스처의 스피너와 같은 이유이므로 같은 시간(`MIN_VISIBLE_MS`)을 건다.
    */
    const handle = render()
    handle.result().refresh()

    await jest.advanceTimersByTimeAsync(100)
    expect(handle.result().isRunning).toBe(true)

    await jest.advanceTimersByTimeAsync(400)
    expect(handle.result().isRunning).toBe(false)
  })
})

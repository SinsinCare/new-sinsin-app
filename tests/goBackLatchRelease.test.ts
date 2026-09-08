/**
 * **취소된 이탈이 뒤로가기를 영구히 죽이는가** — `useGoBack` 의 나가는 중 빗장.
 *
 * ## 실측된 결함
 *
 * `useGoBack` 은 연타를 한 번으로 접으려고 `leaving.current = true` 를 세우고
 * **`focus` 이벤트에서만** 푼다. 그런데 화면이 `usePreventRemove` 로 이탈을 잡으면
 * 그 화면은 **blur 되지 않는다** — blur 가 없으니 focus 도 오지 않고, 빗장은 걸린
 * 채로 남는다. 그 뒤로 그 화면의 뒤로가기는 **영영 아무 일도 하지 않는다.**
 *
 * `src/features/recipe/views/FreePostEditScreen.tsx` 에서 실제로 그 모양이 나왔다: 저장하려는 순간 글이
 * 지워져 있으면(`COMMUNITY_ERROR_001`) 화면이 실패 갈래로 바뀌는데, 그 갈래에는
 * 확인창이 렌더되지 않는다. 뒤로가기 → 가드가 취소 → 확인창 없음 → 게다가 빗장까지
 * 걸려서, 확인창을 되살려 봐야 **두 번째 탭은 이미 죽어 있다.** 두 결함이 겹쳐야
 * "강제 종료 말고는 나갈 방법이 없음" 이 되고, 그래서 둘 다 고쳐야 한다
 * (다른 반쪽은 `tests/writeExitTrap.test.ts`).
 *
 * ## 왜 훅을 실제로 돌리나
 *
 * 여기서 지키려는 것은 **상태 전이**(빗장이 언제 풀리나)라 소스 훑기로는 "코드가
 * 있다" 밖에 못 본다. 이 저장소에는 렌더러가 없고 기존 `hookHarness` 는 `useEffect`
 * 를 일부러 안 돌린다 — 그런데 빗장을 **푸는 쪽**이 전부 effect 안에 산다.
 * 그래서 effect 까지 도는 하네스(`helpers/effectHookHarness.ts`)로 훅 본문을 돌리고,
 * `react-navigation` 의 이벤트 emit 순서를 그대로 흉내 낸다.
 */

import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useGoBack } from "@/src/shared/navigation/useGoBack"

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useMemo: harness.useMemo,
    useCallback: harness.useCallback,
    useEffect: harness.useEffect,
  }
})

jest.mock("@/src/features/analytics", () => ({
  __esModule: true,
  getAnalyticsScreenName: () => "free_post_edit",
  trackAnalyticsEvent: jest.fn(),
}))

/*
  `tests/setup.ts` 의 전역 expo-router 스텁은 렌더만 되게 세운 것이라 `canGoBack` 이
  항상 false 다. 여기서는 스택이 있는 화면을 봐야 하므로 통째로 갈아 끼운다.
  ⚠️ 상태는 **팩토리 안**에 둔다 — ts-jest 가 `jest.mock` 을 import 위로 올리므로
  바깥 변수를 참조하면 TDZ 로 죽는다.
*/
jest.mock("expo-router", () => {
  type Listener = (event: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const state = {
    listeners,
    router: {
      canGoBack: jest.fn(() => true),
      back: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
    },
    segments: ["(write)", "free", "[id]"],
    navigation: {
      addListener(type: string, callback: Listener) {
        ;(listeners[type] ??= []).push(callback)
        return () => {
          listeners[type] = (listeners[type] ?? []).filter(
            (entry) => entry !== callback,
          )
        }
      },
    },
  }
  return {
    __esModule: true,
    __state: state,
    router: state.router,
    useRouter: () => state.router,
    useNavigation: () => state.navigation,
    useSegments: () => state.segments,
    useLocalSearchParams: () => ({}),
  }
})

interface RouterMockState {
  listeners: Record<string, ((event: unknown) => void)[]>
  router: {
    canGoBack: jest.Mock
    back: jest.Mock
    replace: jest.Mock
  }
}

const { __state: mocked } = jest.requireMock("expo-router") as {
  __state: RouterMockState
}

/** 마이크로태스크(빗장을 푸는 자리)를 흘려 보낸다. */
const flushMicrotasks = () => Promise.resolve().then(() => undefined)

/**
 * `react-navigation` 의 `beforeRemove` emit 을 그대로 흉내 낸다.
 *
 * 핵심은 **순서**다. 리스너는 등록 순서로 불리고 `useGoBack` 은 화면(`usePreventRemove`)
 * 보다 먼저 등록되므로, 우리 리스너가 도는 시점에는 아직 `defaultPrevented` 가 false 다
 * (`@react-navigation/core` 의 `useEventEmitter` — 같은 이벤트 객체를 돌려 쓰고
 * `defaultPrevented` 는 클로저를 읽는 getter 다). 그래서 화면의 `preventDefault()` 는
 * 리스너를 다 부른 **뒤에** 부른다. 이 순서를 뒤집으면 결함을 못 본다.
 */
function emitBeforeRemove({ prevented }: { prevented: boolean }) {
  let defaultPrevented = false
  const event = {
    type: "beforeRemove",
    data: { action: { type: "GO_BACK" } },
    get defaultPrevented() {
      return defaultPrevented
    },
    preventDefault() {
      defaultPrevented = true
    },
  }
  for (const listener of [...(mocked.listeners.beforeRemove ?? [])]) {
    listener(event)
  }
  if (prevented) event.preventDefault()
}

function emitFocus() {
  for (const listener of [...(mocked.listeners.focus ?? [])]) {
    listener({ type: "focus" })
  }
}

beforeEach(() => {
  for (const key of Object.keys(mocked.listeners)) delete mocked.listeners[key]
  mocked.router.back.mockClear()
  mocked.router.replace.mockClear()
  mocked.router.canGoBack.mockClear()
  mocked.router.canGoBack.mockImplementation(() => true)
})

describe("나가는 중 빗장 — 취소된 이탈", () => {
  it("가드가 이탈을 취소하면 뒤로가기가 다시 산다", async () => {
    const screen = renderHookWithEffects(() => useGoBack())

    screen.result()()
    expect(mocked.router.back).toHaveBeenCalledTimes(1)

    // 화면이 `usePreventRemove` 로 잡았다 — blur 도 focus 도 오지 않는다.
    emitBeforeRemove({ prevented: true })
    await flushMicrotasks()

    // 사용자가 확인창을 닫고 다시 누른다. 여기가 죽어 있으면 나갈 문이 없다.
    screen.result()()
    expect(mocked.router.back).toHaveBeenCalledTimes(2)
  })

  it("그 뒤로도 계속 산다 — 한 번만 살아나는 것이 아니다", async () => {
    const screen = renderHookWithEffects(() => useGoBack())

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      screen.result()()
      expect(mocked.router.back).toHaveBeenCalledTimes(attempt)
      emitBeforeRemove({ prevented: true })
      await flushMicrotasks()
    }
  })

  it("취소를 알리는 이벤트를 실제로 구독한다", () => {
    renderHookWithEffects(() => useGoBack())
    expect(mocked.listeners.beforeRemove?.length).toBe(1)
    expect(mocked.listeners.focus?.length).toBe(1)
  })
})

describe("나가는 중 빗장 — 원래 막던 것은 그대로 막는다", () => {
  it("연타는 여전히 한 번으로 접힌다", () => {
    const screen = renderHookWithEffects(() => useGoBack())

    screen.result()()
    screen.result()()
    screen.result()()

    expect(mocked.router.back).toHaveBeenCalledTimes(1)
  })

  it("이탈이 성공하면 빗장은 걸린 채다 — 전환 중 두 번째 탭이 두 칸을 빠져나가지 않는다", async () => {
    const screen = renderHookWithEffects(() => useGoBack())

    screen.result()()
    // 취소되지 않은 `beforeRemove`. 화면은 이대로 팝된다.
    emitBeforeRemove({ prevented: false })
    await flushMicrotasks()

    screen.result()()
    expect(mocked.router.back).toHaveBeenCalledTimes(1)
  })

  it("화면으로 돌아오면(focus) 푼다 — 원래의 해제 경로", () => {
    const screen = renderHookWithEffects(() => useGoBack())

    screen.result()()
    emitFocus()
    screen.result()()

    expect(mocked.router.back).toHaveBeenCalledTimes(2)
  })

  it("히스토리가 없으면 그래프로 떨어지고, 그 이탈도 한 번만 나간다", () => {
    mocked.router.canGoBack.mockImplementation(() => false)
    const screen = renderHookWithEffects(() => useGoBack())

    screen.result()()
    screen.result()()

    expect(mocked.router.back).not.toHaveBeenCalled()
    expect(mocked.router.replace).toHaveBeenCalledTimes(1)
  })

  it("언마운트하면 두 구독을 모두 거둔다", () => {
    const screen = renderHookWithEffects(() => useGoBack())
    screen.unmount()

    expect(mocked.listeners.beforeRemove ?? []).toHaveLength(0)
    expect(mocked.listeners.focus ?? []).toHaveLength(0)
  })
})

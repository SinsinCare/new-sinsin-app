/**
 * 상태를 가진 훅을 **렌더러 없이** 동기적으로 돌리는 최소 하네스.
 *
 * ## 왜 이런 것이 필요한가
 *
 * 이 저장소의 jest 는 `testEnvironment: "node"` 이고 `@testing-library/react-native` 도
 * `react-test-renderer` 도 설치돼 있지 않다(실측). 그래서 `renderHook` 이 없다.
 * 그렇다고 훅의 상태 전이를 "같은 로직을 테스트에 다시 써서" 검증하면 그건 훅을 테스트한
 * 것이 아니라 사본을 테스트한 것이 되고, 원본이 바뀌어도 초록으로 남는다.
 *
 * 그래서 `react` 의 훅 4개(`useState`/`useCallback`/`useMemo`/`useRef`)만 갈아 끼워
 * **훅 본문 자체를** 돌린다. 그 4개만 쓰는 훅에만 쓸 수 있다 —
 * `useEffect`/`useSyncExternalStore` 를 쓰는 훅은 여기서 돌리지 않는다(조용히 반쯤
 * 동작하는 것보다 못 돌리는 게 낫다. `useBookmark` 는 대신 `react-dom/server` 로 한 번
 * 렌더해 결과를 붙잡는다 — 그쪽은 상태 전이가 react-query 캐시에 있어서 재렌더가 필요 없다).
 *
 * ## 두 가지를 **일부러 React 와 같게** 맞춘다 (2026-08-20)
 *
 * 이 두 가지가 어긋나 있어서 실제 결함이 테스트를 통과했다:
 *
 * 1. **렌더 중 `setState` 는 다시 렌더한다.** 예전 하네스는 렌더 중에 들어온 갱신을
 *    셀에 바로 쓰고 **재렌더는 하지 않았다.** React 는 반대다 — 진행 중인 렌더의
 *    반환값은 옛 상태 그대로 두고, 함수가 끝나면 갱신을 적용해 **다시 부른다**
 *    ("props 변화에 맞춘 상태 조정" 패턴이 그래서 성립한다). 그 차이 때문에
 *    "렌더 중 리셋" 을 쓰는 훅(`useInfiniteTail`)의 두 번째 렌더가 통째로 없었다.
 * 2. **`useCallback`/`useMemo` 는 의존성을 본다.** 예전 하네스는 의존성을 무시하고
 *    **매 렌더 새 클로저**를 돌려줬다. 그러면 테스트가 아무리 옛 렌더의 콜백을 잡아
 *    두려 해도 언제나 최신 것을 잡게 되어, "옛 조합에서 잡힌 콜백이 늦게 돈다" 는
 *    부류의 결함(늦게 온 다음-페이지 결과가 지금 조합의 꼬리 상태를 지우던 것)을
 *    **구조적으로 볼 수 없었다.**
 *
 * ## 남은 의미 차이
 *
 * - 렌더 밖 `setState` 는 배치하지 않고 즉시 재렌더한다. 그래서 항상 **마지막 렌더의
 *   결과**를 읽어야 한다 — `result()` 가 매번 최신 것을 준다.
 * - 갱신 함수는 큐에 쌓지 않고 즉시 적용한다(연속 호출은 앞 결과를 이어받는다).
 *   값이 `Object.is` 로 같으면 React 처럼 재렌더하지 않는다.
 */

interface Slot {
  value: unknown
  /** `useState` 전용 — 아직 렌더에 반영되지 않은 최신 값. */
  pending?: unknown
  /** `useCallback`/`useMemo` 전용 — 마지막으로 만든 값의 의존성. */
  deps?: readonly unknown[]
}

interface Harness {
  slots: Slot[]
  cursor: number
  render: () => void
  rendering: boolean
  /** 렌더 중에 들어온 갱신이 있는가(React 의 render-phase update). */
  renderPhaseUpdate: boolean
}

let current: Harness | null = null

function harness(): Harness {
  if (current === null) {
    throw new Error(
      "훅 하네스 밖에서 훅이 호출됐다. renderHookSync() 안에서만 쓸 수 있다.",
    )
  }
  return current
}

function slot(initial: () => Slot): Slot {
  const active = harness()
  const index = active.cursor
  active.cursor += 1
  if (active.slots.length <= index) {
    active.slots.push(initial())
  }
  return active.slots[index] as Slot
}

function sameDeps(
  a: readonly unknown[] | undefined,
  b: readonly unknown[] | undefined,
): boolean {
  // 의존성을 아예 안 준 경우는 React 와 같이 **매 렌더 새로** 만든다.
  if (!a || !b || a.length !== b.length) return false
  return a.every((value, index) => Object.is(value, b[index]))
}

export function useState<T>(
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void] {
  const cell = slot(() => {
    const value =
      typeof initial === "function" ? (initial as () => T)() : initial
    return { value, pending: value }
  })
  const active = harness()
  // 렌더가 시작될 때 밀린 갱신을 반영한다 — React 가 다음 렌더에서 큐를 소진하는 자리.
  cell.value = cell.pending
  const setState = (next: T | ((prev: T) => T)) => {
    const previous = cell.pending as T
    const value =
      typeof next === "function" ? (next as (prev: T) => T)(previous) : next
    cell.pending = value
    // 값이 그대로면 React 는 재렌더하지 않는다(bailout).
    if (Object.is(value, cell.value)) return
    /*
      렌더 중 호출이면 **이 렌더의 반환값은 건드리지 않고** 끝난 뒤 다시 돌린다.
      셀에 즉시 써 버리면 두 번째 렌더가 없어져서, 렌더 중 리셋을 쓰는 훅의 동작이
      테스트에서만 달라진다(머리말 1).
    */
    if (active.rendering) active.renderPhaseUpdate = true
    else active.render()
  }
  return [cell.value as T, setState]
}

export function useRef<T>(initial: T): { current: T } {
  const cell = slot(() => ({ value: { current: initial } }))
  return cell.value as { current: T }
}

export function useCallback<T>(fn: T, deps?: readonly unknown[]): T {
  const cell = slot(() => ({ value: fn, deps }))
  if (!sameDeps(cell.deps, deps)) {
    cell.value = fn
    cell.deps = deps
  }
  return cell.value as T
}

export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T {
  const cell = slot(() => ({ value: factory(), deps }))
  if (!sameDeps(cell.deps, deps)) {
    cell.value = factory()
    cell.deps = deps
  }
  return cell.value as T
}

export interface HookHandle<T> {
  /** 항상 마지막 렌더의 반환값. */
  result: () => T
  /** 렌더 횟수. 상태가 정말 바뀌었는지 볼 때 쓴다. */
  renderCount: () => number
}

/** 렌더 중 갱신이 서로를 부르며 끝나지 않는 것을 잡는다(React 는 25에서 던진다). */
const MAX_RENDER_PHASE_PASSES = 25

/** 훅을 한 번 돌리고, 이후 `setState` 마다 동기적으로 다시 돌린다. */
export function renderHookSync<T>(hook: () => T): HookHandle<T> {
  const active: Harness = {
    slots: [],
    cursor: 0,
    rendering: false,
    renderPhaseUpdate: false,
    render: () => {},
  }
  let latest: T
  let renders = 0
  active.render = () => {
    const previous = current
    current = active
    try {
      let passes = 0
      do {
        active.renderPhaseUpdate = false
        active.cursor = 0
        active.rendering = true
        try {
          latest = hook()
          renders += 1
        } finally {
          active.rendering = false
        }
        passes += 1
        if (passes > MAX_RENDER_PHASE_PASSES) {
          throw new Error("렌더 중 상태 갱신이 끝나지 않는다(무한 재렌더).")
        }
        // 렌더 중 갱신이 있었으면 React 처럼 **같은 커밋 안에서** 다시 돌린다.
      } while (active.renderPhaseUpdate)
    } finally {
      current = previous
    }
  }
  active.render()
  return {
    result: () => latest,
    renderCount: () => renders,
  }
}

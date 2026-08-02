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
 * ## 의미 차이를 알고 쓴다
 *
 * - `useCallback`/`useMemo` 는 의존성 비교를 하지 않고 매 렌더 새로 만든다. 참조 안정성은
 *   여기서 검증할 대상이 아니고(그건 렌더 횟수의 문제다), 값 정확성은 그대로 유지된다.
 * - `setState` 는 배치하지 않고 즉시 재렌더한다. 그래서 항상 **마지막 렌더의 결과**를
 *   읽어야 한다 — `result()` 가 매번 최신 것을 준다.
 */

interface Slot {
  value: unknown
}

interface Harness {
  slots: Slot[]
  cursor: number
  render: () => void
  rendering: boolean
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

function slot<T>(initial: () => T): Slot {
  const active = harness()
  const index = active.cursor
  active.cursor += 1
  if (active.slots.length <= index) {
    active.slots.push({ value: initial() })
  }
  return active.slots[index] as Slot
}

export function useState<T>(
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void] {
  const cell = slot<T>(() =>
    typeof initial === "function" ? (initial as () => T)() : initial,
  )
  const active = harness()
  const setState = (next: T | ((prev: T) => T)) => {
    const previous = cell.value as T
    cell.value =
      typeof next === "function" ? (next as (prev: T) => T)(previous) : next
    // 렌더 중 호출은 렌더가 끝난 뒤 한 번만 다시 돌린다(무한 재귀 방지).
    if (!active.rendering) active.render()
  }
  return [cell.value as T, setState]
}

export function useRef<T>(initial: T): { current: T } {
  const cell = slot<{ current: T }>(() => ({ current: initial }))
  return cell.value as { current: T }
}

export function useCallback<T>(fn: T): T {
  return fn
}

export function useMemo<T>(factory: () => T): T {
  return factory()
}

export interface HookHandle<T> {
  /** 항상 마지막 렌더의 반환값. */
  result: () => T
  /** 렌더 횟수. 상태가 정말 바뀌었는지 볼 때 쓴다. */
  renderCount: () => number
}

/** 훅을 한 번 돌리고, 이후 `setState` 마다 동기적으로 다시 돌린다. */
export function renderHookSync<T>(hook: () => T): HookHandle<T> {
  const active: Harness = {
    slots: [],
    cursor: 0,
    rendering: false,
    render: () => {},
  }
  let latest: T
  let renders = 0
  active.render = () => {
    const previous = current
    current = active
    active.cursor = 0
    active.rendering = true
    try {
      latest = hook()
      renders += 1
    } finally {
      active.rendering = false
      current = previous
    }
  }
  active.render()
  return {
    result: () => latest,
    renderCount: () => renders,
  }
}

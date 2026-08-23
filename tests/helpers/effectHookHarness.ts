/**
 * `useEffect` 까지 도는 최소 훅 하네스.
 *
 * ## 왜 `hookHarness.ts` 로는 안 되나
 *
 * 그쪽은 `useState`/`useCallback`/`useMemo`/`useRef` 넷만 갈아 끼우고 `useEffect` 를
 * 쓰는 훅은 **일부러 돌리지 않는다**(그 파일 머리말 — "조용히 반쯤 동작하는 것보다
 * 못 돌리는 게 낫다"). 그런데 이 저장소에서 `useEffect` 안에만 사는 계약이 하나 있다:
 * `useGoBack` 의 **나가는 중 빗장**이다. 빗장을 세우는 곳은 콜백이고 푸는 곳은
 * 이벤트 구독(effect)이라, effect 를 안 돌리면 "푸는 쪽" 을 아예 볼 수 없다 —
 * 그리고 실제로 깨진 곳이 푸는 쪽이었다.
 *
 * 그래서 이 하네스는 넷에 `useEffect` 를 더한다. `react` 를 통째로 대신하지 않고,
 * 테스트 파일이 `jest.mock("react", …)` 로 이 다섯 개만 갈아 끼워 쓴다.
 *
 * ## React 와 같게 맞춘 것
 *
 * - effect 는 렌더가 **끝난 뒤** 실행된다(렌더 도중이 아니라).
 * - 의존성이 그대로면 다시 실행하지 않는다. 바뀌면 **정리 함수를 먼저** 부른다.
 * - `unmount()` 는 남은 정리 함수를 역순으로 부른다.
 *
 * ## 남은 의미 차이
 *
 * 배치가 없다 — 렌더 밖 `setState` 는 즉시 재렌더한다. 그래서 결과는 항상
 * `result()` 로 **마지막 렌더의 것**을 읽는다.
 */

interface Slot {
  value: unknown
  deps?: readonly unknown[]
}

interface EffectSlot {
  deps?: readonly unknown[]
  cleanup?: (() => void) | void
  pending?: () => (() => void) | void
}

interface Instance {
  slots: Slot[]
  cursor: number
  effects: EffectSlot[]
  effectCursor: number
  queue: (() => void)[]
  render: () => void
}

let current: Instance | null = null

function instance(): Instance {
  if (current === null) {
    throw new Error(
      "훅 하네스 밖에서 훅이 호출됐다. renderHookWithEffects() 안에서만 쓸 수 있다.",
    )
  }
  return current
}

function slot(initial: () => Slot): Slot {
  const active = instance()
  const index = active.cursor
  active.cursor += 1
  if (active.slots.length <= index) active.slots.push(initial())
  return active.slots[index] as Slot
}

function sameDeps(
  a: readonly unknown[] | undefined,
  b: readonly unknown[] | undefined,
): boolean {
  if (!a || !b || a.length !== b.length) return false
  return a.every((value, index) => Object.is(value, b[index]))
}

export function useRef<T>(initial: T): { current: T } {
  return slot(() => ({ value: { current: initial } })).value as { current: T }
}

export function useState<T>(
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void] {
  const cell = slot(() => ({
    value: typeof initial === "function" ? (initial as () => T)() : initial,
  }))
  const active = instance()
  const setState = (next: T | ((prev: T) => T)) => {
    const value =
      typeof next === "function"
        ? (next as (prev: T) => T)(cell.value as T)
        : next
    if (Object.is(value, cell.value)) return
    cell.value = value
    active.render()
  }
  return [cell.value as T, setState]
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

export function useEffect(
  fn: () => (() => void) | void,
  deps?: readonly unknown[],
): void {
  const active = instance()
  const index = active.effectCursor
  active.effectCursor += 1
  const first = active.effects.length <= index
  if (first) active.effects.push({})
  const cell = active.effects[index] as EffectSlot

  if (!first && sameDeps(cell.deps, deps)) return
  cell.deps = deps
  // 렌더 중에 부수효과를 내지 않는다 — React 처럼 커밋 뒤로 미룬다.
  active.queue.push(() => {
    cell.cleanup?.()
    cell.cleanup = fn()
  })
}

export interface EffectHookHandle<T> {
  /** 항상 마지막 렌더의 반환값. */
  result: () => T
  /** 같은 인스턴스를 한 번 더 렌더한다(의존성 변화를 보려고). */
  rerender: () => void
  /** 남은 정리 함수를 역순으로 부른다. */
  unmount: () => void
  renderCount: () => number
}

export function renderHookWithEffects<T>(hook: () => T): EffectHookHandle<T> {
  const active: Instance = {
    slots: [],
    cursor: 0,
    effects: [],
    effectCursor: 0,
    queue: [],
    render: () => {},
  }
  let latest: T
  let renders = 0

  active.render = () => {
    const previous = current
    current = active
    try {
      active.cursor = 0
      active.effectCursor = 0
      latest = hook()
      renders += 1
    } finally {
      current = previous
    }
    // 커밋 — 밀어 둔 effect 를 등록 순서대로 실행한다.
    const queued = active.queue.splice(0)
    queued.forEach((run) => run())
  }

  active.render()

  return {
    result: () => latest,
    rerender: () => active.render(),
    unmount: () => {
      ;[...active.effects].reverse().forEach((cell) => {
        cell.cleanup?.()
        cell.cleanup = undefined
      })
    },
    renderCount: () => renders,
  }
}

/**
 * 네이티브 모달 전이 게이트 — iOS 프리징 계열의 뿌리를 자르는 전역 직렬화.
 *
 * iOS 의 RN Modal 은 자기 뷰트리 VC 에서 present 하고 topmost 탐색이 없다
 * (V2DialogHost 머리말). 그래서 두 네이티브 모달의 present/dismiss 전환이
 * 겹치면 UIKit 전환이 끝내 마무리되지 않고 UITransitionView 가 남아 **앱 전체
 * 터치가 죽는다** — 2026-08-03 식사 기록 텍스트 분석·홈 시작 시점 프리징이
 * 전부 이 계열이었다(LoadingOverlay 머리말). 개별 호출부마다 setTimeout 을
 * 심는 대신, 모든 전이를 한 큐에 세워 **한 번에 하나만** 움직이게 한다.
 *
 * 이 모듈은 순수 TS 다 — react-native 를 import 하지 않아 bun test 로 검증한다.
 * 컴포넌트 쪽 절반은 AppModal.tsx.
 *
 * 두 가지를 지킨다:
 * 1. **전이 직렬화**: enqueueTransition 에 들어온 작업(= present 또는 dismiss
 *    한 번)은 FIFO 로 하나씩 실행된다. 작업 안에서 onShow/onDismiss 가 올 때까지
 *    기다리므로, 다음 전이는 앞 전이의 애니메이션이 끝난 뒤에야 시작한다.
 * 2. **형제 가시성 대기**: 루트 VC 가 이미 다른 모달을 띄우고 있으면 새 present
 *    는 조용히 거부된다(보이지 않는 모달 = 상태만 열린 유령). 그래서 present 는
 *    "지금 보이는 모달 수 == 내 중첩 깊이"(내 조상들만 보이는 상태)가 될 때까지
 *    큐 **밖에서** 기다린다 — 큐 안에서 기다리면 그 형제의 dismiss 까지 막아
 *    데드락이 된다.
 */

type Waiter = () => void

let chain: Promise<unknown> = Promise.resolve()
let pendingTransitions = 0
const idleWaiters: Waiter[] = []

/** 전이 작업 하나를 큐에 세운다. 앞선 작업들이 모두 끝난 뒤 실행된다. */
export function enqueueTransition<T>(job: () => Promise<T>): Promise<T> {
  pendingTransitions += 1
  const run = async (): Promise<T> => {
    try {
      return await job()
    } finally {
      pendingTransitions -= 1
      if (pendingTransitions === 0) {
        idleWaiters.splice(0).forEach((waiter) => waiter())
      }
    }
  }
  const result = chain.then(run, run)
  // 다음 작업은 이번 작업의 실패 여부와 무관하게 이어진다.
  chain = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

/** 큐가 빌 때까지 기다린다. 이미 비어 있으면 즉시. */
export function whenTransitionsIdle(): Promise<void> {
  if (pendingTransitions === 0) return Promise.resolve()
  return new Promise((resolve) => idleWaiters.push(resolve))
}

/** 테스트·디버깅용 — 대기+실행 중인 전이 수. */
export function pendingTransitionCount(): number {
  return pendingTransitions
}

/* ── 가시성 레지스트리 ─────────────────────────────────────────── */

const visibleModals = new Set<number>()
const registryWaiters: Waiter[] = []
let nextModalId = 1

function notifyRegistry() {
  registryWaiters.splice(0).forEach((waiter) => waiter())
}

export function allocateModalId(): number {
  return nextModalId++
}

/** present 를 시작하는 순간 부른다 — 형제들이 이 모달을 보이는 것으로 센다. */
export function markModalPresented(id: number) {
  visibleModals.add(id)
  notifyRegistry()
}

/** dismiss 완료(또는 언마운트) 시 부른다. */
export function markModalGone(id: number) {
  if (visibleModals.delete(id)) notifyRegistry()
}

export function visibleModalCount(): number {
  return visibleModals.size
}

/** 레지스트리가 다음으로 변할 때까지 기다린다. */
export function whenRegistryChanges(): Promise<void> {
  return new Promise((resolve) => registryWaiters.push(resolve))
}

/* ── 핸들러용 유틸 ─────────────────────────────────────────────── */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** promise 가 ms 안에 안 끝나면 그냥 진행한다 — onShow/onDismiss 유실 대비. */
export function withDeadline(
  promise: Promise<void>,
  ms: number,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    const timer = setTimeout(finish, ms)
    void promise.then(() => {
      clearTimeout(timer)
      finish()
    })
  })
}

/**
 * 모달 전이가 다 가라앉은 뒤에 실행해야 하는 일(라우터 push/pop,
 * Share.share 같은 RN Modal 밖 네이티브 VC 전환)을 위한 대기.
 *
 * ```ts
 * const confirmed = await showConfirm({...})
 * if (!confirmed) return
 * await afterModalTransitions()
 * router.back()
 * ```
 *
 * 다이얼로그의 promise 는 모달이 **닫히기 전에** resolve 되므로(50ms 는 그
 * 상태 변경이 dismiss 전이를 큐에 넣을 시간), 큐가 빈 뒤 짧은 버퍼를 더 둔다.
 */
export async function afterModalTransitions(): Promise<void> {
  await delay(50)
  await whenTransitionsIdle()
  await delay(80)
}

/**
 * `afterModalTransitions()` 에 더해 **형제 모달이 실제로 사라질 때까지** 기다린다.
 *
 * ■ 왜 따로 필요한가 (2026-08-19, 식사 결과 공유가 시트 뒤에 떴다)
 *
 * `afterModalTransitions()` 는 **전이 큐**만 본다. 큐가 비었다는 것은 "움직이는
 * 중인 모달이 없다" 는 뜻이지 **"떠 있는 모달이 없다"** 가 아니다. 두 값은 다르다:
 * 액션시트가 자기 자리에 가만히 떠 있으면 큐는 비어 있고 `visibleModalCount()` 는 1 이다.
 *
 * 그 차이가 공유에서 터졌다. `UIActivityViewController`(expo-sharing)와 RN Modal 은
 * **서로 다른 VC 를 골라 present 한다**:
 *
 * | 쪽          | present 대상                                            |
 * |-------------|---------------------------------------------------------|
 * | RN Modal    | 자기 뷰트리의 `reactViewController` — topmost 탐색 없음  |
 * | expo-sharing| `keyWindow.rootViewController` 에서 **topmost 까지 순회** |
 *   (expo-modules-core `Utilities.swift` `currentViewController()`)
 *
 * 그래서 액션시트가 아직 붙어 있는 채로 공유를 부르면 iOS 가 고른 topmost 와
 * pageSheet 로 뜬 결과 모달의 계층이 어긋나 **활동 시트가 뒤로 들어간다.**
 * 거부되는 게 아니라 **떠 있는데 안 보인다** — 예외도 없고 로그도 없다.
 *
 * `delay` 를 늘리는 것으로는 못 고친다. 시간 문제가 아니라 **계층 문제**다.
 * 그래서 시간이 아니라 **레지스트리가 비는 것**(내 조상들만 남는 것)을 기다린다.
 *
 * @param depth 내 중첩 깊이. 이 수만큼은 남아 있어도 정상이다(내 조상들).
 *              결과 모달 안에서 부르면 1 — 그 모달 자신은 남아 있어야 한다.
 */
export async function afterSiblingModalsGone(depth = 0): Promise<void> {
  await afterModalTransitions()
  // 형제가 남아 있으면 사라질 때까지. 큐 밖에서 기다린다 — 큐 안에서 기다리면
  // 그 형제의 dismiss 전이까지 막아 데드락이 된다(이 파일 머리말 2번).
  let guard = 0
  while (visibleModalCount() > depth && guard < 40) {
    guard += 1
    await Promise.race([whenRegistryChanges(), delay(50)])
  }
  // 레지스트리는 dismiss 완료 시점에 지워지지만 UIKit 의 teardown 이
  // 몇 프레임 더 남는다 — 그 뒤에 present 해야 계층이 확정된다.
  await delay(120)
}

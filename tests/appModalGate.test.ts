import {
  afterModalTransitions,
  afterSiblingModalsGone,
  allocateModalId,
  enqueueTransition,
  markModalGone,
  markModalPresented,
  pendingTransitionCount,
  visibleModalCount,
  whenRegistryChanges,
  whenTransitionsIdle,
  withDeadline,
} from "../src/shared/components/appModalGate"

const tick = () => new Promise<void>((r) => setTimeout(r, 0))
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

describe("enqueueTransition", () => {
  test("작업은 FIFO 로 하나씩 실행된다 — 앞 작업이 끝나기 전에 다음이 시작되지 않는다", async () => {
    const order: string[] = []
    let releaseFirst!: () => void
    const firstGate = new Promise<void>((r) => {
      releaseFirst = r
    })

    const first = enqueueTransition(async () => {
      order.push("first:start")
      await firstGate
      order.push("first:end")
    })
    const second = enqueueTransition(async () => {
      order.push("second:start")
    })

    await delay(10)
    // 첫 작업이 잡고 있는 동안 둘째는 시작되지 않는다.
    expect(order).toEqual(["first:start"])

    releaseFirst()
    await Promise.all([first, second])
    expect(order).toEqual(["first:start", "first:end", "second:start"])
  })

  test("작업이 던져도 큐는 계속 돈다", async () => {
    const failing = enqueueTransition(async () => {
      throw new Error("boom")
    })
    await expect(failing).rejects.toThrow("boom")

    const result = await enqueueTransition(async () => "alive")
    expect(result).toBe("alive")
  })

  test("작업의 반환값이 그대로 전달된다", async () => {
    const outcome = await enqueueTransition(async () => "retry" as const)
    expect(outcome).toBe("retry")
  })
})

describe("whenTransitionsIdle", () => {
  test("큐가 비어 있으면 즉시 resolve", async () => {
    expect(pendingTransitionCount()).toBe(0)
    await whenTransitionsIdle()
  })

  test("실행 중 작업이 끝난 뒤에야 resolve", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    const job = enqueueTransition(() => gate)

    let idle = false
    const waiter = whenTransitionsIdle().then(() => {
      idle = true
    })
    await delay(10)
    expect(idle).toBe(false)

    release()
    await job
    await waiter
    expect(idle).toBe(true)
    expect(pendingTransitionCount()).toBe(0)
  })
})

describe("withDeadline", () => {
  test("promise 가 먼저 끝나면 그때 resolve", async () => {
    const start = Date.now()
    await withDeadline(delay(10), 5000)
    expect(Date.now() - start).toBeLessThan(1000)
  })

  test("promise 가 안 끝나면 deadline 에 resolve — onShow 유실 폴백", async () => {
    const never = new Promise<void>(() => {})
    const start = Date.now()
    await withDeadline(never, 30)
    expect(Date.now() - start).toBeGreaterThanOrEqual(25)
  })
})

describe("가시성 레지스트리", () => {
  test("present/gone 마킹이 개수에 반영되고 대기자가 깨어난다", async () => {
    const id = allocateModalId()
    const before = visibleModalCount()

    let changed = false
    const waiter = whenRegistryChanges().then(() => {
      changed = true
    })

    markModalPresented(id)
    expect(visibleModalCount()).toBe(before + 1)
    await waiter
    expect(changed).toBe(true)

    markModalGone(id)
    expect(visibleModalCount()).toBe(before)
  })

  test("없는 id 를 gone 처리해도 대기자를 깨우지 않는다", async () => {
    let woken = false
    void whenRegistryChanges().then(() => {
      woken = true
    })
    markModalGone(999_999)
    await tick()
    expect(woken).toBe(false)
    // 다음 테스트가 대기자를 물려받지 않도록 정리
    const id = allocateModalId()
    markModalPresented(id)
    markModalGone(id)
  })
})

describe("afterModalTransitions", () => {
  test("진행 중인 전이가 끝날 때까지 기다린다", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    const job = enqueueTransition(() => gate)

    let settled = false
    const waiter = afterModalTransitions().then(() => {
      settled = true
    })
    await delay(120)
    expect(settled).toBe(false)

    release()
    await job
    await waiter
    expect(settled).toBe(true)
  })
})

/*
  회귀 고정 — 2026-08-19 "공유 시트가 컴포넌트 뒤에 떠서 안 보임".

  `afterModalTransitions` 는 **전이 큐**만 본다. 큐가 비었다는 건 "움직이는 모달이
  없다" 이지 "떠 있는 모달이 없다" 가 아니다. 그 차이 때문에 액션시트가 붙어 있는
  채로 `UIActivityViewController` 가 present 돼 pageSheet 뒤로 들어갔다.
  (원인 전문은 appModalGate.ts 의 `afterSiblingModalsGone` 머리말)
*/
describe("afterSiblingModalsGone", () => {
  test("큐가 비어도 형제 모달이 떠 있으면 기다린다 — 이게 afterModalTransitions 와의 차이", async () => {
    const sibling = allocateModalId()
    markModalPresented(sibling)
    expect(pendingTransitionCount()).toBe(0) // 큐는 비어 있다
    expect(visibleModalCount()).toBe(1) // 그런데 모달은 떠 있다

    let settled = false
    const waiter = afterSiblingModalsGone(0).then(() => {
      settled = true
    })

    // 큐가 비어 있으므로 afterModalTransitions 였다면 여기서 이미 통과했다.
    await delay(250)
    expect(settled).toBe(false)

    markModalGone(sibling)
    await waiter
    expect(settled).toBe(true)
  })

  test("depth 만큼의 조상은 떠 있어도 통과한다 — 자기가 속한 모달까지 기다리면 영영 안 열린다", async () => {
    const self = allocateModalId()
    markModalPresented(self)

    let settled = false
    await afterSiblingModalsGone(1).then(() => {
      settled = true
    })
    expect(settled).toBe(true)
    expect(visibleModalCount()).toBe(1) // 자기 모달은 그대로 살아 있다

    markModalGone(self)
  })

  test("형제가 끝내 안 사라져도 무한 대기하지 않는다", async () => {
    const stuck = allocateModalId()
    markModalPresented(stuck)

    await afterSiblingModalsGone(0) // guard 상한에서 빠져나온다
    expect(visibleModalCount()).toBe(1)

    markModalGone(stuck)
  })
})

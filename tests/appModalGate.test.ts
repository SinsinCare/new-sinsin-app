import {
  afterModalTransitions,
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

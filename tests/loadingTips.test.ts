import {
  LOADING_TIP_KEYS,
  createTipCycler,
} from "../src/features/home/components/loadingTips"

/** 결정적 난수 — 같은 씨앗이면 같은 순서. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

describe("분석 로딩 팁 순환", () => {
  test("키가 16개다 — 화면이 보여 주기로 한 개수와 같다", () => {
    expect(LOADING_TIP_KEYS).toHaveLength(16)
    expect(new Set(LOADING_TIP_KEYS).size).toBe(16)
  })

  test("한 바퀴 안에서 같은 팁을 두 번 보여 주지 않는다", () => {
    const count = LOADING_TIP_KEYS.length
    const cycler = createTipCycler(count, seeded(7))
    const seen = [cycler.current()]
    for (let i = 1; i < count; i += 1) seen.push(cycler.next())
    expect(new Set(seen).size).toBe(count)
    expect([...seen].sort((a, b) => a - b)).toEqual(
      Array.from({ length: count }, (_, index) => index),
    )
  })

  test("바퀴가 바뀌어도 직전 팁과 같은 팁이 연속되지 않는다 — 씨앗 200개", () => {
    const count = LOADING_TIP_KEYS.length
    for (let seed = 1; seed <= 200; seed += 1) {
      const cycler = createTipCycler(count, seeded(seed))
      let previous = cycler.current()
      // 세 바퀴 반 — 경계를 세 번 지난다.
      for (let step = 0; step < count * 3 + count / 2; step += 1) {
        const value = cycler.next()
        expect(value).not.toBe(previous)
        previous = value
      }
    }
  })

  test("경계를 지난 뒤의 바퀴도 전부 다른 팁이다", () => {
    const count = LOADING_TIP_KEYS.length
    const cycler = createTipCycler(count, seeded(42))
    for (let i = 0; i < count; i += 1) cycler.next() // 첫 바퀴 소진 + 새 바퀴 첫 칸
    const second = [cycler.current()]
    for (let i = 1; i < count; i += 1) second.push(cycler.next())
    expect(new Set(second).size).toBe(count)
  })

  test("팁이 하나뿐이면 항상 0 — 겹침을 피할 수 없으니 던지지 않는다", () => {
    const cycler = createTipCycler(1, seeded(3))
    expect(cycler.current()).toBe(0)
    expect(cycler.next()).toBe(0)
  })
})

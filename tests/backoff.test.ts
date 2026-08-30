/**
 * 백오프 계약.
 *
 * 지터는 "대충 흩뿌리면 된다" 가 아니다. **경계가 지켜져야** 그 위에 걸린 타임아웃과
 * "최대 얼마나 기다리는가" 라는 약속이 유지된다. 그래서 통계적 확인만 하지 않고
 * 난수를 주입해 하한·상한을 정확히 본다 — 통계만 보면 "가끔 상한을 넘는" 결함을 놓친다.
 *
 * 서버 쪽에 같은 계약의 도우미가 있다(`sinsin-be-bun/src/infra/backoff.ts`).
 * 저장소가 달라 두 벌이지만 **규칙은 같게 유지한다.**
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { backoffMs, jitter } from "@/src/lib/backoff"

describe("jitter", () => {
  it("항상 [d/2, d] 안이다 — 상한을 넘으면 타임아웃 계산이 어긋난다", () => {
    expect(jitter(1000, () => 0)).toBe(500)
    expect(jitter(1000, () => 0.999999)).toBe(1000)
    expect(jitter(1000, () => 0.5)).toBe(750)
  })

  it("0 이하와 비정상 값은 0 이다 — 던지지 않는다", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(jitter(value)).toBe(0)
    }
  })

  it("실제 난수로 1000번 뽑아도 경계를 벗어나지 않는다", () => {
    for (let index = 0; index < 1000; index += 1) {
      const value = jitter(800)
      expect(value).toBeGreaterThanOrEqual(400)
      expect(value).toBeLessThanOrEqual(800)
    }
  })

  it("실제로 퍼진다 — 같은 값만 나오면 지터가 아니다", () => {
    const seen = new Set(Array.from({ length: 200 }, () => jitter(10_000)))
    expect(seen.size).toBeGreaterThan(100)
  })
})

describe("backoffMs", () => {
  it("지수로 자라되 상한에서 멈춘다", () => {
    const at = (attempt: number) =>
      backoffMs(attempt, { baseMs: 1000, maxMs: 8000, random: () => 0.999999 })
    expect([at(0), at(1), at(2), at(3), at(4), at(10)]).toEqual([
      1000, 2000, 4000, 8000, 8000, 8000,
    ])
  })

  it("바닥은 상한의 절반이다 — 서버가 아직 아플 때 즉시 돌아오지 않는다", () => {
    const at = (attempt: number) => backoffMs(attempt, { baseMs: 1000, maxMs: 8000, random: () => 0 })
    expect([at(0), at(1), at(3)]).toEqual([500, 1000, 4000])
  })

  it("큰 attempt 가 Infinity 로 새지 않는다", () => {
    expect(backoffMs(5000, { baseMs: 1000, maxMs: 8000, random: () => 0.5 })).toBe(6000)
  })
})

describe("호출부 배선", () => {
  /*
    도우미가 옳아도 **불리지 않으면** 아무것도 안 한다. 재시도하는 자리가 실제로
    지터를 지나는지 소스에서 확인한다 — 특히 분석 전송은 우리가 가진 재시도 중
    **주체가 가장 많다**(설치 수만큼).
  */
  const CALLERS = [
    ["src/services/core/queryClient.ts", "backoffMs("],
    ["src/features/analytics/transport.ts", "jitter(retryDelayMs)"],
  ] as const

  it.each(CALLERS)("%s 이 지터를 지난다", (relative, marker) => {
    const source = readFileSync(join(process.cwd(), relative), "utf8")
    expect(source).toContain(marker)
  })

  it("분석 전송이 지터를 우회하지 않는다", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/analytics/transport.ts"),
      "utf8",
    )
    // 지터 없는 직접 대입이 남아 있으면 그 경로는 여전히 정렬된 채 재시도한다.
    expect(source).not.toContain("Date.now() + retryDelayMs")
  })
})

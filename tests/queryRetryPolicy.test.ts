import { ApiError } from "../src/services/core/apiError"
import {
  queryClient,
  queryRetryDelay,
  shouldRetryQuery,
} from "../src/services/core/queryClient"

describe("query retry policy", () => {
  it("retries bounded transient reads but never deterministic 4xx responses", () => {
    expect(
      shouldRetryQuery(0, new ApiError("offline", "NETWORK", 0, true)),
    ).toBe(true)
    expect(shouldRetryQuery(1, new ApiError("server", "HTTP_503", 503))).toBe(
      true,
    )
    expect(shouldRetryQuery(2, new ApiError("server", "HTTP_503", 503))).toBe(
      false,
    )
    expect(shouldRetryQuery(0, new ApiError("auth", "HTTP_401", 401))).toBe(
      false,
    )
    expect(shouldRetryQuery(0, new ApiError("busy", "HTTP_429", 429))).toBe(
      false,
    )
  })

  it("disables global mutation replay and caps exponential delay", () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false)

    /*
      값을 정확히 단정하던 자리다(`[1000, 2000, 4000, 8000, 8000]`). 지터가 들어가면서
      그 단정이 불가능해졌는데, **바뀐 것은 계약이 아니라 계약의 모양**이다:
      상한은 그대로고 하한이 절반으로 내려갔다(`lib/backoff.ts` 의 equal jitter).

      정확한 값 대신 경계를 본다 — 오히려 더 강한 판정이다. 예전 단정은 "지수로 자란다"
      만 확인했지 "상한을 넘지 않는다" 를 모든 시도에 대해 확인하지는 못했다.
    */
    const ceilings = [1_000, 2_000, 4_000, 8_000, 8_000]
    ceilings.forEach((ceiling, attempt) => {
      for (let sample = 0; sample < 50; sample += 1) {
        const delay = queryRetryDelay(attempt)
        expect(delay).toBeGreaterThanOrEqual(ceiling / 2)
        expect(delay).toBeLessThanOrEqual(ceiling)
      }
    })
  })

  it("spreads retries so a recovering server is not hit in lockstep", () => {
    /*
      **이게 지터를 넣은 이유다.** 고정 간격이면 서버가 살아나는 순간 설치 기반 전체가
      같은 시점에 다시 온다. 같은 값만 나오면 지터가 아니다.
    */
    const samples = new Set(Array.from({ length: 200 }, () => queryRetryDelay(3)))
    expect(samples.size).toBeGreaterThan(100)
  })
})

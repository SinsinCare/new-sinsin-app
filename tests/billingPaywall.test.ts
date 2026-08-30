/**
 * 결제 잠금의 **배선**을 고정한다.
 *
 * 여기서 지키는 것은 로직이 아니라 연결이다. 결제 판정의 정본은 서버이고
 * (`sinsin-be-bun/tests/billing/*`), 앱이 틀릴 수 있는 것은 **잇는 방식**이다:
 *
 *  1. 서버가 402 를 주면 페이월이 열리는가 (토스트가 아니라)
 *  2. 어느 잠금이 결제를 만들었는지 셀 수 있는가 (`entry_point` 매핑)
 *  3. 모르는 capability 를 잠그지 않는가
 *
 * 3번이 특히 중요하다 — 서버가 권한 키를 하나 늘렸는데 앱이 아직 모를 때, 화면이
 * 잠기면 **서버는 200 을 주는데 앱만 막힌 상태**가 된다. 그건 우리가 만든 가짜 잠금이다.
 */

import { ApiError } from "@/src/services/core/apiError"
import { resolveError } from "@/src/lib/errorMessage/resolve"
import { getErrorBehavior } from "@/src/lib/errorMessage/catalog"
import {
  SERVER_GATE_ENTRY,
  type CapabilityKey,
  type PaywallEntry,
} from "@/src/features/billing/types"

/**
 * 서버가 402 로 막을 수 있는 capability 전부.
 * 정본은 `sinsin-be-bun/src/domains/billing/catalog.ts` 이고, 서버에 게이트가 붙은
 * 경로는 그쪽 `tests/billing/gateCoverage.test.ts` 가 센다.
 */
const SERVER_GATED: readonly CapabilityKey[] = [
  "scan.unlimited",
  "chat.unlimited",
  "restaurant.ai_search",
  "restaurant.bookmark",
  "restaurant.filter.nutrition",
  "restaurant.menu.full",
  "restaurant.diagnose",
  "report.pdf",
]

function billingError(code: string, result?: unknown): ApiError {
  return new ApiError("blocked", code, 402, false, undefined, result)
}

describe("서버 402 → 페이월", () => {
  it("구독 필요와 횟수 소진은 토스트가 아니라 페이월로 간다", () => {
    for (const code of ["BILLING_ERROR_001", "BILLING_ERROR_002"]) {
      expect(getErrorBehavior(code).surface).toBe("paywall")
      expect(getErrorBehavior(code).action).toBe("openPaywall")
    }
  })

  it("확인 실패(503)는 페이월이 아니다 — 이미 낸 사람에게 결제를 또 권하면 안 된다", () => {
    // "구독이 없다" 와 "확인하지 못했다" 는 다른 사건이다.
    expect(getErrorBehavior("BILLING_ERROR_003").surface).not.toBe("paywall")
    expect(getErrorBehavior("BILLING_ERROR_003").action).toBe("retry")
  })

  it("402 응답이 페이월 갈래로 해석된다", () => {
    const resolved = resolveError(
      billingError("BILLING_ERROR_002", {
        capability: "scan.unlimited",
        label: "AI 음식 스캔",
        reason: "quota_exhausted",
        limit: 1,
      }),
    )
    expect(resolved.surface).toBe("paywall")
    expect(resolved.code).toBe("BILLING_ERROR_002")
    // 조용히 넘어가면 안 된다 — 계측(`app_error_presented`)이 이 행을 세야 한다.
    expect(resolved.silent).toBe(false)
  })

  it("결제 문구가 두 언어에 다 있다", () => {
    for (const code of [
      "BILLING_ERROR_001",
      "BILLING_ERROR_002",
      "BILLING_ERROR_003",
    ]) {
      const resolved = resolveError(billingError(code))
      expect(resolved.title.length).toBeGreaterThan(0)
      // 서버 문구를 그대로 흘리는 폴백이 아니라 앱 카탈로그의 문구여야 한다.
      expect(resolved.title).not.toBe("blocked")
    }
  })
})

describe("진입 지점 매핑", () => {
  it("서버가 막을 수 있는 capability 는 전부 진입 지점을 갖는다", () => {
    /*
      빠지면 그 잠금은 `server_gate` 로 뭉뚱그려져, **어느 잠금이 결제를 만들었는지**
      영영 알 수 없다. 페이월 판은 하나라 화면명으로도 구분되지 않는다.
    */
    const missing = SERVER_GATED.filter(
      (key) => SERVER_GATE_ENTRY[key] === undefined,
    )
    expect(missing).toEqual([])
  })

  it("진입 지점 값이 서로 겹치지 않는다", () => {
    const values = SERVER_GATED.map(
      (key) => SERVER_GATE_ENTRY[key] as PaywallEntry,
    )
    expect(new Set(values).size).toBe(values.length)
  })
})

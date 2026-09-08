/**
 * 복원 판정. 레드팀 검수에서 두 화면이 **똑같이 틀려 있던** 자리다.
 *
 * 결함: `await syncNow()` 직후에 컴포넌트의 `status` 를 읽었는데, 그 값은 콜백이
 * 만들어질 때 닫힌 클로저의 낡은 것이다. 그래서 복원에 성공해도 항상
 * "복원할 내역이 없어요" 가 뜨고, `restore_completed` 도 `restored: false` 로 나갔다 —
 * **지표상으로는 복원이 한 번도 성공한 적 없는 기능**이 된다.
 *
 * 판정을 순수 함수로 뺐으므로 여기서 렌더러 없이 확인한다. 화면이 그 함수를 실제로
 * 쓰는지는 아래 "배선" 블록이 소스에서 직접 본다.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { didRestoreSomething } from "@/src/features/billing/restoreOutcome"
import type { BillingStatus } from "@/src/features/billing/types"

function status(plan: BillingStatus["plan"]): BillingStatus {
  return {
    plan,
    entitlement: null,
    capabilities: {},
    appUserId: "sin_test",
    stale: false,
  }
}

describe("didRestoreSomething", () => {
  it("서버가 유료로 인정했을 때만 복원됐다고 말한다", () => {
    expect(didRestoreSomething("purchased", status("premium"))).toBe(true)
    expect(didRestoreSomething("purchased", status("care_plus"))).toBe(true)
  })

  it("스토어가 성공을 줘도 서버가 무료면 복원된 것이 아니다", () => {
    // 복원할 것이 없어도 스토어는 성공으로 돌아온다.
    expect(didRestoreSomething("purchased", status("free"))).toBe(false)
  })

  it("동기화를 못 했으면 복원됐다고 말하지 않는다", () => {
    /*
      그때 우리가 아는 것은 "확인하지 못했다" 이고, 거기서 "복원됐어요" 라고 하면
      다음 화면에서 여전히 잠긴 것을 보게 된다 — 거짓 약속이 침묵보다 나쁘다.
    */
    expect(didRestoreSomething("purchased", null)).toBe(false)
  })

  it("사용자가 취소했거나 실패했으면 복원이 아니다", () => {
    expect(didRestoreSomething("cancelled", status("premium"))).toBe(false)
    expect(didRestoreSomething("failed", status("premium"))).toBe(false)
  })
})

describe("배선", () => {
  const sources = [
    "src/features/billing/hooks/usePaywallController.ts",
    "src/features/billing/hooks/useSubscriptionScreen.ts",
  ]

  it("두 화면이 같은 판정 함수를 쓴다 — 복붙된 판정은 갈라진다", () => {
    for (const rel of sources) {
      const source = readFileSync(join(process.cwd(), rel), "utf8")
      expect(source).toContain("didRestoreSomething")
    }
  })

  it("복원 판정을 컴포넌트의 status 에서 읽지 않는다", () => {
    /*
      이 문자열이 되살아나면 클로저 함정도 같이 되살아난다. 정확히 그 형태를 막는다.
      (양성 대조: 아래 정규식은 결함이 있던 옛 코드
      `outcome.status === "purchased" && (status?.plan ?? "free") !== "free"` 를 잡는다.)
    */
    const stalePattern = /\(status\?\.plan\s*\?\?\s*"free"\)\s*!==\s*"free"/u
    expect(stalePattern.test('(status?.plan ?? "free") !== "free"')).toBe(true)
    for (const rel of sources) {
      const source = readFileSync(join(process.cwd(), rel), "utf8")
      expect(stalePattern.test(source)).toBe(false)
    }
  })
})

/**
 * "복원이 실제로 뭔가를 되살렸는가" 의 판정. **한 곳에만 둔다.**
 *
 * 같은 세 줄이 페이월과 구독 관리 화면에 복붙돼 있었고, 그 복붙본이 **둘 다 틀려
 * 있었다** — `await syncNow()` 직후에 컴포넌트의 `status` 를 읽었는데, 그 값은 콜백이
 * 만들어질 때 닫힌 클로저의 낡은 것이라 복원에 성공해도 항상 "복원할 내역이 없어요" 가
 * 떴다(레드팀 검수에서 확인).
 *
 * 판정을 순수 함수로 빼면 두 가지가 동시에 해결된다: 복붙이 사라지고, **렌더러 없이
 * 테스트할 수 있다.** 클로저 함정은 "무엇으로 판정하는가" 의 문제이므로 그 입력을
 * 명시적 인자로 만드는 것이 곧 수정이다.
 */

import type { BillingStatus } from "./types"

export type RestorePurchaseStatus = "purchased" | "cancelled" | "failed"

/**
 * @param purchase 스토어 복원 호출의 결과.
 * @param synced   복원 뒤 **서버에서 다시 받은** 상태. 동기화가 실패했으면 `null`.
 */
export function didRestoreSomething(
  purchase: RestorePurchaseStatus,
  synced: BillingStatus | null,
): boolean {
  /*
    스토어가 "복원했다" 고 해도 그것만으로는 부족하다 — 복원할 것이 없어도 성공으로
    돌아온다. **서버가 유료로 인정했을 때만** 되살아난 것이다.

    동기화 실패(`null`)를 false 로 접는 것은 의도적이다. 그때 우리가 아는 것은
    "확인하지 못했다" 이고, 그 상태에서 "복원됐어요" 라고 말하면 그 다음 화면에서
    여전히 잠긴 것을 보게 된다 — 거짓 약속이 침묵보다 나쁘다.
  */
  if (purchase !== "purchased") return false
  return synced !== null && synced.plan !== "free"
}

/**
 * 페이월을 **어디서든** 여는 명령형 통로. `lib/dialog.ts` 와 같은 계보다.
 *
 * ## 왜 명령형인가
 *
 * 페이월이 열리는 자리가 둘이고 성질이 다르다:
 *
 *   **① 서버 402 가 연다.** 어떤 API 든 `BILLING_ERROR_001/002` 를 돌려주면 페이월이
 *   떠야 한다. 그 코드를 받는 곳은 `lib/errorMessage/present.ts` 하나인데, 거기는
 *   컴포넌트가 아니라 함수다 — 훅으로는 열 수 없다.
 *
 *   **② 잠긴 요소를 눌러서 연다.** 이쪽은 컴포넌트라 훅으로도 되지만, 같은 화면을
 *   두 방식으로 열면 계측(`entry_point`)이 두 갈래가 된다.
 *
 * 그래서 통로를 하나로 두고 호스트가 그린다. 이 설계의 값은 **기능마다 사전 검사를
 * 붙이지 않아도 우회로가 안 생긴다**는 것이다 — 새 유료 API 를 추가하고 앱에서
 * 아무것도 안 해도, 402 가 오면 페이월이 뜬다.
 */

import { isBillingHidden } from "./billingVisibility"
import type { CapabilityKey, PaywallEntry, PaywallReason } from "./types"

export interface PaywallRequest {
  /** 어디서 열렸는지. 계측의 `entry_point` 가 된다(기획서 §06). */
  readonly entry: PaywallEntry
  /** 무엇이 막혔는지. 서버 402 면 응답의 `result` 가 그대로 온다. */
  readonly reason?: PaywallReason | null
  /** 막힌 기능. `reason` 이 없을 때(사용자가 잠긴 요소를 누른 경우) 쓴다. */
  readonly capability?: CapabilityKey
}

type PaywallHandler = (request: PaywallRequest) => void

const hosts: PaywallHandler[] = []

/**
 * 호스트 등록. 스택이라 **나중에 마운트된 쪽이 가져간다** — RN Modal 안에서 열어야 할
 * 때 그 안에 하나 더 얹으면 된다(`V2DialogHost` 와 같은 이유·같은 함정).
 */
export function registerPaywallHost(handler: PaywallHandler): () => void {
  hosts.push(handler)
  return () => {
    const index = hosts.lastIndexOf(handler)
    if (index >= 0) hosts.splice(index, 1)
  }
}

/**
 * 페이월을 연다. **호스트가 없으면 아무 일도 안 한다** — 던지지 않는다.
 *
 * 호스트가 없는 순간이 실제로 있다(앱 부팅 직후, 로그인 화면). 그때 예외를 던지면
 * 결제와 무관한 화면이 결제 때문에 깨진다.
 */
export function openPaywall(request: PaywallRequest): void {
  // 결제 기능이 숨겨진 동안은 어디서 불려도 열지 않는다(`billingVisibility.ts`).
  if (isBillingHidden()) return
  hosts[hosts.length - 1]?.(request)
}

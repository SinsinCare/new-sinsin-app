/**
 * 결제 상태 API. 서버는 `sinsin-be-bun` 의 `src/domains/billing/`.
 *
 * **두 개뿐이다.** 상품 목록을 서버에서 받지 않는 이유는 서버 쪽 `routes.ts` 머리말에
 * 있다 — 가격·통화·현지화의 정본은 스토어이고 SDK 가 직접 가져온다.
 */

import { api } from "@/src/services/core"
import type { BillingStatus } from "../types"

export const billingApi = {
  /** 지금 무엇을 쓸 수 있는가. 화면을 그리는 데 필요한 전부가 한 번에 온다. */
  async getStatus(): Promise<BillingStatus> {
    const { data } = await api.get("/billing/me")
    return data.result as BillingStatus
  },

  /**
   * RC 에서 지금 당장 다시 읽어라. 구매·복원 직후에 부른다.
   *
   * 웹훅을 기다리면 결제하고도 잠긴 화면 앞에 몇 초에서 몇 분을 앉아 있게 된다.
   * 실패하면 503(`BILLING_ERROR_003`)이고, 그건 **"구독 없음" 이 아니라 "모른다"** 다 —
   * 호출부는 그 차이를 지켜야 한다.
   */
  async sync(): Promise<BillingStatus> {
    const { data } = await api.post("/billing/sync")
    return data.result as BillingStatus
  },
}

/** react-query 키. 무효화 지점이 여러 곳이라 한곳에 모은다. */
export const BILLING_QUERY_KEY = ["billing", "me"] as const

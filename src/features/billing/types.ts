/**
 * 서버 `GET /api/v1/billing/me` 의 거울. **여기서 정책을 다시 계산하지 않는다.**
 *
 * 정본은 서버의 `domains/billing/catalog.ts` 다. 앱이 plan 을 받아 자기 표로 다시 풀면
 * 정책이 두 벌이 되고, 정책이 바뀔 때마다 앱 배포를 기다려야 한다. 그래서 서버가
 * **capability 마다의 완성된 답**(잠금 상태·몫·잔량)을 내려보내고 앱은 그리기만 한다.
 *
 * ## 모르는 capability 는 **열어 둔다**
 *
 * 서버가 키를 하나 늘렸는데 앱이 아직 모르면, 그 화면은 잠기는 것이 아니라 **열려야**
 * 한다. 이유는 하나다 — 진짜 잠금은 서버가 한다. 앱이 모르는 것을 잠그면 그건 우리가
 * 만든 가짜 잠금이고, 서버는 200 을 주는데 화면만 막힌다. 반대로 열어 두면 최악이
 * "눌렀더니 페이월이 뜬다" 이고, 그건 정상 동작이다.
 */

/** 기획서 §02 의 L0 / L1 / L2. 서버는 이 문자열로 답한다. */
export type LockState = "open" | "peek" | "blocked"

export type Plan = "free" | "premium" | "care_plus"

/**
 * 기획서 §06 의 권한 키. **서버의 카탈로그가 정본**이고 이 목록은 그 거울이다.
 * 여기 없는 키가 응답에 오면 `useFeatureAccess` 가 열린 것으로 다룬다(머리말).
 */
export type CapabilityKey =
  | "stats.period.week"
  | "stats.period.month"
  | "stats.metric.all"
  | "stats.history.unlimited"
  | "restaurant.filter.nutrition"
  | "restaurant.diagnose"
  | "restaurant.menu.full"
  | "restaurant.ai_search"
  | "restaurant.bookmark"
  | "scan.unlimited"
  | "chat.unlimited"
  | "report.pdf"
  | "share.caregiver"
  | "link.nhis"
  | "link.doctor"

export interface QuotaState {
  limit: number
  used: number
  remaining: number
  /** 다음 기간이 시작되는 시각(서버 naive UTC 문자열). */
  resetsAt: string
  window: "day" | "month"
}

export interface CapState {
  limit: number
  /** 소유 도메인이 셀 수 없으면 null — 화면은 잔량을 **숨긴다**(0 으로 그리지 않는다). */
  used: number | null
  remaining: number | null
}

export interface CapabilityState {
  capability: CapabilityKey
  lockState: LockState
  /** 이 몫까지는 열린다(지표 1개 · 메뉴 3개 · 30일). null 이면 제한 없음. */
  allowance: number | null
  quota: QuotaState | null
  cap: CapState | null
}

export interface EntitlementSummary {
  key: string
  plan: Plan
  status: string
  periodType: string
  productId: string | null
  store: string | null
  willRenew: boolean
  expiresAt: string | null
  environment: string
}

export interface BillingStatus {
  plan: Plan
  entitlement: EntitlementSummary | null
  capabilities: Partial<Record<CapabilityKey, CapabilityState>>
  /** RC 에 보낼 식별자. **서버가 발급한다** — 앱이 만들지 않는다. */
  appUserId: string
  /** 접근을 주는 권한의 만료가 지났다. 유예일 수도, 웹훅을 놓친 것일 수도 있다. */
  stale: boolean
}

/**
 * 서버가 402 와 함께 실어 보내는 것. 앱은 **이 하나로** 페이월을 띄우고 무엇이
 * 막혔는지 말할 수 있어야 한다.
 */
export interface PaywallReason {
  capability: CapabilityKey
  label: string
  reason: "subscription_required" | "quota_exhausted"
  limit?: number
  used?: number
  resetsAt?: string
}

/** 페이월을 연 자리. 기획서 §06 의 `entry_point` 표. */
export type PaywallEntry =
  | "stats_day_metric"
  | "stats_day_prev_date"
  | "stats_week_insight"
  | "stats_week_chart"
  | "stats_week_metric_switch"
  | "stats_month_metric"
  | "stats_month_weekly"
  | "stats_month_sticky"
  | "restaurant_filter_nutrition"
  | "restaurant_ai_search"
  | "restaurant_menu_all"
  | "restaurant_diagnose"
  | "restaurant_bookmark"
  | "meal_scan_limit"
  | "meal_analysis_metric"
  | "ai_chat_limit"
  | "report_export"
  | "settings_subscription"
  | "home_banner"
  | "push_weekly_ready"
  /** 서버 402 가 열었는데 어느 화면인지 모를 때. **이 값이 늘면 매핑이 빠진 것이다.** */
  | "server_gate"

/**
 * capability → 서버 402 가 열었을 때 쓸 진입 지점.
 *
 * **이 표가 없으면 퍼널이 조용히 비어 버린다** — 서버가 막은 요청은 화면이 아니라
 * 응답에서 오므로, 어느 잠금이 결제를 만들었는지 알 방법이 이것뿐이다.
 * 여기 없는 capability 는 `server_gate` 로 떨어지고, 그 값이 대시보드에 보이면
 * 매핑이 빠졌다는 신호다.
 */
export const SERVER_GATE_ENTRY: Readonly<
  Partial<Record<CapabilityKey, PaywallEntry>>
> = {
  "scan.unlimited": "meal_scan_limit",
  "chat.unlimited": "ai_chat_limit",
  "restaurant.ai_search": "restaurant_ai_search",
  "restaurant.bookmark": "restaurant_bookmark",
  "restaurant.filter.nutrition": "restaurant_filter_nutrition",
  "restaurant.menu.full": "restaurant_menu_all",
  "restaurant.diagnose": "restaurant_diagnose",
  "report.pdf": "report_export",
}

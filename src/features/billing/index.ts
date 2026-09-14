/**
 * 결제 기능의 공개 표면.
 *
 * 화면이 알아야 하는 것은 셋뿐이다:
 *   `useFeatureAccess(capability, entry)`  이 기능을 지금 쓸 수 있는가
 *   `<QuotaBadge access={…} />`            남은 횟수
 *   `openPaywall({ entry })`               페이월 열기
 *
 * 나머지(SDK · 동기화 · 판정)는 `BillingProvider` 안에서 끝난다.
 */

export { BillingProvider, useBilling } from "./BillingProvider"
export { isBillingHidden } from "./billingVisibility"
export { PaywallHost } from "./components/PaywallHost"
export { PlanCard } from "./components/PlanCard"
export { QuotaBadge } from "./components/QuotaBadge"
export { useFeatureAccess, type FeatureAccess } from "./hooks/useFeatureAccess"
export { cheapestPerDay, formatLikePrice, perDayPrice } from "./pricing"
export {
  openPaywall,
  registerPaywallHost,
  type PaywallRequest,
} from "./paywallHost"
export { forgetUser as forgetPurchasesUser } from "./purchases/purchasesClient"
export { BILLING_QUERY_KEY, billingApi } from "./services/billingApi"
export type {
  BillingStatus,
  CapabilityKey,
  CapabilityState,
  LockState,
  PaywallEntry,
  PaywallReason,
  Plan,
} from "./types"

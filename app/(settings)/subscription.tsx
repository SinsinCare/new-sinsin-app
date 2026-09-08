import { Redirect } from "expo-router"

import { isBillingHidden } from "@/src/features/billing/billingVisibility"
import { SubscriptionScreen } from "@/src/features/billing/views/SubscriptionScreen"

export default function SubscriptionRoute() {
  // 결제 기능이 숨겨진 동안은 딥링크로도 들어올 수 없다(`billingVisibility.ts`).
  if (isBillingHidden()) return <Redirect href="/(settings)" />
  return <SubscriptionScreen />
}

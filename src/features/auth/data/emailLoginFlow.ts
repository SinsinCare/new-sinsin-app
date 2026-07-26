import type { AuthSessionResult } from "@/src/services/types/serviceTypes"
import { getDestinationForAccountState } from "../utils/accountStateRoute"

type AccountStateResult = Pick<
  AuthSessionResult,
  "accountState" | "requiresAdditionalInfo" | "entryGate"
>

/**
 * Keeps login and withdrawal-recovery navigation aligned with the backend's
 * account-state entry gate rather than assuming every restored account is HOME.
 */
export function getPostAuthenticationDestination(result: AccountStateResult) {
  return getDestinationForAccountState(
    result.accountState,
    result.requiresAdditionalInfo,
    result.entryGate,
  )
}

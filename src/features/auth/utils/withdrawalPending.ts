import { isApiErrorLike } from "@/src/services/core/apiError"
import type { WithdrawalPendingResult } from "@/src/types"

export function getWithdrawalPendingResult(
  error: unknown,
): WithdrawalPendingResult | null {
  if (!isApiErrorLike(error) || error.code !== "AUTH_ERROR_008") {
    return null
  }
  const result = error.result
  if (
    result !== null &&
    typeof result === "object" &&
    "cancelToken" in result &&
    typeof (result as { cancelToken?: unknown }).cancelToken === "string"
  ) {
    return result as WithdrawalPendingResult
  }
  return null
}

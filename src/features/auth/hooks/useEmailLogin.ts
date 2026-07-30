import { useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/src/hooks"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { showErrorToast } from "@/src/lib/toast"
import { isApiErrorLike } from "@/src/services/core/apiError"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import type { LoginForm } from "../types"
import { getWithdrawalPendingResult } from "../utils/withdrawalPending"
import type { WithdrawalPendingResult } from "@/src/types"

export function useEmailLogin() {
  const { t } = useTranslation("auth")
  const { signInWithEmail, cancelWithdrawal, isLoading } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [withdrawalPending, setWithdrawalPending] =
    useState<WithdrawalPendingResult | null>(null)
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false)

  const submitLogin = async (data: LoginForm) => {
    setLoginError(null)
    try {
      const result = await signInWithEmail(data.email, data.password)
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (e: unknown) {
      const pending = getWithdrawalPendingResult(e)
      if (pending) {
        setWithdrawalPending(pending)
        return
      }
      setLoginError(
        isApiErrorLike(e) && e.isNetworkError
          ? t("login.networkError")
          : t("login.credentialsError"),
      )
    }
  }

  const clearLoginError = () => setLoginError(null)
  const dismissWithdrawalPending = () => setWithdrawalPending(null)
  const confirmWithdrawalCancel = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return
    setIsCancellingWithdrawal(true)
    try {
      await cancelWithdrawal(withdrawalPending.cancelToken)
      setWithdrawalPending(null)
      router.replace("/(tabs)/home")
    } catch (e: unknown) {
      showErrorToast(getErrorMessage(e, t("withdrawal.cancelFailed")))
    } finally {
      setIsCancellingWithdrawal(false)
    }
  }

  return {
    isLoading,
    loginError,
    withdrawalPending,
    isCancellingWithdrawal,
    clearLoginError,
    dismissWithdrawalPending,
    confirmWithdrawalCancel,
    submitLogin,
  }
}

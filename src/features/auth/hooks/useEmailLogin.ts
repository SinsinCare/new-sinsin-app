import { useState } from "react"
import { router } from "expo-router"
import { useAuth } from "@/src/hooks"
import { showErrorToast } from "@/src/lib/toast"
import { getPostAuthenticationDestination } from "../data/emailLoginFlow"
import type { LoginForm } from "../types"
import { getWithdrawalPendingResult } from "../utils/withdrawalPending"
import type { WithdrawalPendingResult } from "@/src/types"

export function useEmailLogin() {
  const { signInWithEmail, cancelWithdrawal, isLoading } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [withdrawalPending, setWithdrawalPending] =
    useState<WithdrawalPendingResult | null>(null)
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false)

  const submitLogin = async (data: LoginForm) => {
    setLoginError(null)
    try {
      const result = await signInWithEmail(data.email, data.password)
      router.replace(getPostAuthenticationDestination(result))
    } catch (e: unknown) {
      const pending = getWithdrawalPendingResult(e)
      if (pending) {
        setWithdrawalPending(pending)
        return
      }
      setLoginError(
        e instanceof Error
          ? e.message
          : "이메일 또는 비밀번호를 다시 확인해주세요.",
      )
    }
  }

  const clearLoginError = () => setLoginError(null)
  const dismissWithdrawalPending = () => setWithdrawalPending(null)
  const confirmWithdrawalCancel = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return
    setIsCancellingWithdrawal(true)
    try {
      const result = await cancelWithdrawal(withdrawalPending.cancelToken)
      setWithdrawalPending(null)
      router.replace(getPostAuthenticationDestination(result))
    } catch (e: unknown) {
      showErrorToast(
        e instanceof Error
          ? e.message
          : "회원탈퇴 취소 중 문제가 발생했습니다.",
      )
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

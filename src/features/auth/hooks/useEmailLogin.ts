import { useState } from "react"
import { router } from "expo-router"
import { useAuth } from "@/src/hooks"
import { presentError } from "@/src/lib/errorMessage"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import type { LoginForm } from "../types"
import { presentAuthFailure } from "../utils/authFailure"
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
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (e: unknown) {
      // 탈퇴 진행 중(`AUTH_ERROR_008`)은 화면이 직접 받는다 — 탈퇴를 취소하고
      // 로그인할지 묻는 모달과 취소 토큰이 필요해서다.
      const pending = getWithdrawalPendingResult(e)
      if (pending) {
        /* 소셜 쪽과 **같은 이름**으로 센다. 종전에는 이 경로에 아무 흔적이 없어
           "탈퇴 대기 계정이 로그인을 시도했다" 는 사실이 소셜 진입로에서만 보였다. */
        trackAnalyticsEvent("auth_withdrawal_prompt_viewed", {
          source: "email",
        })
        setWithdrawalPending(pending)
        return
      }
      /* 예전에는 응답 없음이면 "인터넷 연결을 확인해 주세요", **그 밖의 전부**를
         "이메일 또는 비밀번호가 맞지 않아요" 로 적었다. 그래서 가입한 적 없는
         계정(`AUTH_ERROR_001`)·정지된 계정(`AUTH_ERROR_007`)·서버 오류까지 전부
         비밀번호를 의심하게 만들었다. 고칠 수 없는 것을 고치라고 시킨 셈이다. */
      setLoginError(presentAuthFailure(e, { scope: "email-login" }))
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
      // 취소 토큰은 아직 손에 있다(모달을 닫지 않았다). 그래서 다시 시도가
      // 실제로 같은 동작을 다시 하는 자리다.
      presentError(e, {
        scope: "withdrawal-cancel",
        retry: () => void confirmWithdrawalCancel(),
      })
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

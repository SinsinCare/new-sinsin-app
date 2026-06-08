import { useState } from "react"
import Toast from "react-native-toast-message"
import { useAuth } from "@/src/hooks/useAuth"
import { logger } from "@/src/lib/logger"
import type { SocialProvider, WithdrawalPendingResult } from "@/src/types"
import { getWithdrawalPendingResult } from "../utils/withdrawalPending"

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
  kakao: "카카오",
}

function getDebugMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return "오류 메시지가 없는 로그인 실패입니다."
}

export function useSocialLogin() {
  const { signInWithSocialProvider, cancelWithdrawal, isUserCancelledError } =
    useAuth()
  const [socialLoading, setSocialLoading] = useState(false)
  const [withdrawalPending, setWithdrawalPending] =
    useState<WithdrawalPendingResult | null>(null)
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false)

  const loginWithProvider = async (provider: SocialProvider) => {
    if (socialLoading) return

    setSocialLoading(true)
    try {
      await signInWithSocialProvider(provider)
    } catch (error) {
      if (isUserCancelledError(error)) return

      const pending = getWithdrawalPendingResult(error)
      if (pending) {
        setWithdrawalPending(pending)
        return
      }

      const label = PROVIDER_LABELS[provider]
      const msg = getDebugMessage(error)
      logger.debug("[useSocialLogin] social login error", {
        provider,
        message: msg,
      })
      Toast.show({
        type: "error",
        text1: `${label} 로그인 실패`,
        text2: msg,
        visibilityTime: 5000,
      })
    } finally {
      setSocialLoading(false)
    }
  }

  const confirmWithdrawalCancellation = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return

    setIsCancellingWithdrawal(true)
    try {
      await cancelWithdrawal(withdrawalPending.cancelToken)
      setWithdrawalPending(null)
    } catch (error) {
      const msg = getDebugMessage(error)
      Toast.show({
        type: "error",
        text1: "회원탈퇴 취소 실패",
        text2: msg,
        visibilityTime: 5000,
      })
    } finally {
      setIsCancellingWithdrawal(false)
    }
  }

  return {
    socialLoading,
    withdrawalPending,
    isCancellingWithdrawal,
    loginWithProvider,
    confirmWithdrawalCancellation,
    dismissWithdrawalPending: () => setWithdrawalPending(null),
  }
}

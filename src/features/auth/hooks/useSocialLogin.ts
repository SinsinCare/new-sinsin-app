import { useState } from "react"
import Toast from "react-native-toast-message"
import { router } from "expo-router"
import { useAuth } from "@/src/hooks/useAuth"
import { logger } from "@/src/lib/logger"
import type { SocialProvider, WithdrawalPendingResult } from "@/src/types"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../utils/socialLoginFlow"
import { getPostAuthenticationDestination } from "../data/emailLoginFlow"

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
  const [currentProvider, setCurrentProvider] = useState<SocialProvider | null>(
    null,
  )
  const [withdrawalPending, setWithdrawalPending] =
    useState<WithdrawalPendingResult | null>(null)
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false)

  const loginWithProvider = async (provider: SocialProvider) => {
    if (socialLoading) return

    setSocialLoading(true)
    setCurrentProvider(provider)
    try {
      const result = await signInWithSocialProvider(provider)
      const action = getSocialLoginSuccessAction(result)
      if (action.type === "consent_required") {
        router.push({
          pathname: "/(auth)/terms-agreement",
          params: {
            mode: "social",
            provider: action.provider,
            socialSignupToken: action.socialSignupToken,
          },
        })
      }
    } catch (error) {
      const action = getSocialLoginErrorAction(
        error,
        provider,
        isUserCancelledError,
      )
      if (action.type === "cancelled") return
      if (action.type === "withdrawal_pending") {
        setWithdrawalPending(action.result)
        return
      }
      if (action.type === "provider_email_required") {
        Toast.show({
          type: "error",
          text1: action.title,
          text2: action.message,
          visibilityTime: 7000,
        })
        return
      }
      if (action.type === "legacy_social_link_required") {
        router.push({
          pathname: "./social-link-email",
          params: {
            provider: action.provider,
            socialLinkToken: action.socialLinkToken,
          },
        })
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
      setCurrentProvider(null)
    }
  }

  const confirmWithdrawalCancellation = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return

    setIsCancellingWithdrawal(true)
    try {
      const result = await cancelWithdrawal(withdrawalPending.cancelToken)
      setWithdrawalPending(null)
      router.replace(getPostAuthenticationDestination(result))
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
    socialLoadingMessage: currentProvider
      ? `${PROVIDER_LABELS[currentProvider]} 로그인 중...`
      : "로그인 중...",
    withdrawalPending,
    isCancellingWithdrawal,
    loginWithProvider,
    confirmWithdrawalCancellation,
    dismissWithdrawalPending: () => setWithdrawalPending(null),
  }
}

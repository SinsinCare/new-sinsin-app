import { useState } from "react"
import Toast from "react-native-toast-message"
import { router } from "expo-router"
import { useAuth } from "@/src/hooks/useAuth"
import { ApiError } from "@/src/services/core/apiError"
import { logger } from "@/src/lib/logger"
import type {
  SocialLinkRequiredResult,
  SocialProvider,
  WithdrawalPendingResult,
} from "@/src/types"
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

function getSocialLinkRequiredResult(
  error: unknown,
): SocialLinkRequiredResult | null {
  if (!(error instanceof ApiError) || error.code !== "AUTH_ERROR_004") {
    return null
  }
  const result = error.result
  if (!result || typeof result !== "object") return null
  const { provider, socialLinkToken } =
    result as Partial<SocialLinkRequiredResult>
  if (
    (provider === "google" || provider === "apple" || provider === "kakao") &&
    typeof socialLinkToken === "string" &&
    socialLinkToken.length > 0
  ) {
    return { provider, socialLinkToken }
  }
  return null
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
      await signInWithSocialProvider(provider)
    } catch (error) {
      if (isUserCancelledError(error)) return

      const pending = getWithdrawalPendingResult(error)
      if (pending) {
        setWithdrawalPending(pending)
        return
      }

      const socialLinkRequired = getSocialLinkRequiredResult(error)
      if (socialLinkRequired) {
        router.push({
          pathname: "./social-link-email",
          params: {
            provider: socialLinkRequired.provider,
            socialLinkToken: socialLinkRequired.socialLinkToken,
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
